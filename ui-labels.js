import * as THREE from 'three';
import {scene} from "./three-sac";
import {set_buffer_at_index} from "./ui-util";

const directions = {
    up: new THREE.Vector3(0, 1, 0),
    in: new THREE.Vector3(0, 0, 1),
}

const alignment = (align, w) => {
    const a = {
        left: 0,
        center: w/2,
        right: w
    }
    return a[align];
}

const vc = {
    a: new THREE.Vector3(0, 0, 0),
    b: new THREE.Vector3(0, 0, 0),
    c: new THREE.Vector3(0, 0, 0),
    d: new THREE.Vector3(0, 0, 0),
    e: new THREE.Vector3(0, 0, 0),
    up: new THREE.Vector3(0, 0, 1),
}

const tick_pos = (d) => {
    return {
        L: [-d,0,0],
        R: [d,0,0],
        T: [0,-d,0],
        B: [0,d,0],
        I: [0,0.0,d],
        O: [0,0.0,-d]
    }
}

const labels = {
    font: 'Helvetica',
    async set_font(font_name, font_url){
        let f = new FontFace(`${font_name}`, `url(${font_url})`);
        const bar = await f.load().then((res) => {
            return res
        }).catch((error) => {
			return error;
		});
        if(bar.family){
            labels.font = bar.family;
        }
        return bar;
    },
    ready: false,
    texture_resolution: 1024,
    padding: 20,
    all: [],
    groups: {
        y: [],
    },
    axes:{
        x:[],
        y:[],
        z:[]
    },
    bounds:{
        x:[-360,0],
        z:[-90,90],
        y:[0,100]
    },
    object: new THREE.Group(),
    label(format){
        function render(cam_quaternion){
            L.mesh.quaternion.copy(cam_quaternion);
        }

        function update(fmt=null){
            const dims = [0,0];
            const g = L.canvas.getContext('2d');
            const sc = labels.texture_resolution;
            const sp = labels.padding;
            const p_ost = sc+(sp*2);
            L.canvas.width = p_ost;
            L.canvas.height = p_ost;

            if(fmt === null) fmt = L.format;

            fmt.text_array.map((tx,i) =>{
                g.font = `${Math.round(sc*tx.size)}px ${labels.font}`;
                tx.w = g.measureText(tx.text).width;
                tx.a = g.measureText(tx.text).actualBoundingBoxAscent;
                tx.d = g.measureText(tx.text).actualBoundingBoxDescent;
                dims[0] = Math.max(dims[0], tx.w);
                dims[1] += (tx.a+tx.d)+(i > 0 ? fmt.line_padding: 0);
                tx.baseline = dims[1]-tx.d;
            });
            dims[0] += (sp*2);
            dims[1] += (sp*2);

            if(dims[0] > p_ost) dims[0] = p_ost;

            if(L.ready && (L.dims[0] !== dims[0]/p_ost || L.dims[1] !== dims[1]/p_ost)){
                L.reshape_geometry(dims[0]/p_ost, dims[1]/p_ost);
            }
            L.dims = [dims[0]/p_ost, dims[1]/p_ost];

            g.fillStyle = '#000000';
            g.fillRect(0, 0, L.canvas.width, L.canvas.height);

            fmt.text_array.map(tx =>{
                g.fillStyle = 'white';
                g.textAlign = fmt.align;
                if(fmt.baseline_visible) g.fillRect(sp, sp + (tx.baseline - 2.0), dims[0] - (sp * 2), 2.0);
                const x_offset = alignment(fmt.align, dims[0]-(sp*2));
                g.font = `${Math.round(sc*tx.size)}px ${labels.font}`;
                g.fillText(tx.text, sp + x_offset, sp + tx.baseline);
            });

            if(L.texture) L.texture.needsUpdate = true;



            if(L.ready && fmt.dynamic !== null){
                // L.object.updateMatrix();
                // L.object.updateMatrixWorld();
                vc.a.copy(fmt.dynamic.anchor);
                // vc.b.copy(L.object.position);
                L.object.worldToLocal(vc.a);
                vc.b.copy(vc.a).normalize().multiplyScalar(-fmt.tick_offset);
                vc.c.copy(vc.a).normalize().multiplyScalar(-fmt.dynamic.offset);
                // L.object.worldToLocal(vc.b);
                set_buffer_at_index(L.line.geometry.attributes.position.array, 0, vc.b.toArray());
                set_buffer_at_index(L.line.geometry.attributes.position.array, 1, vc.c.toArray());

                L.mesh.position.copy(vc.b);
                L.line.geometry.attributes.position.needsUpdate = true;
            }
        }

        function reshape_geometry(w, h){
            const g = [[-w/2,h/2,0.0],[w/2,h/2,0.0],[-w/2,-h/2,0.0],[w/2,-h/2,0.0]];
            for(let i=0;i<4;i++){
                set_buffer_at_index(L.mesh.geometry.attributes.position.array, i, g[i]);
            }
            L.mesh.geometry.attributes.position.needsUpdate = true;
            L.texture.repeat.set(w,h);
            L.texture.offset.y = 1.0-h;
        }

        function init(fmt){
            L.update(fmt);
            L.object = new THREE.Group();

            if(fmt.tick !== null) {
                const dir = tick_pos(fmt.tick_offset)[fmt.tick];
                dir.push(...[0,0,0]);
                const line_pos = Float32Array.from(dir);
                const geometry = new THREE.BufferGeometry();
                geometry.setAttribute('position', new THREE.BufferAttribute(line_pos, 3));
                let material;
                if(fmt.tick_dashed){
                    material = new THREE.LineDashedMaterial({
                        color: 0xFFFFFF,
                        scale: 1.0,
                        dashSize: 0.1,
                        gapSize: 0.1,
                    })
                }else{
                    material = new THREE.LineBasicMaterial({
                        color: 0xFFFFFF,
                    });
                }

                L.line = new THREE.Line(geometry, material);
                L.line.computeLineDistances();
                L.object.add(L.line);
            }

            //console.log(L.dims);
            L.texture = new THREE.Texture(L.canvas);
            //L.texture.minFilter = THREE.LinearFilter;
            L.texture.repeat.set(L.dims[0], L.dims[1]);
            L.texture.offset.y = 1.0-L.dims[1];
            L.texture.needsUpdate = true;

            const geometry = new THREE.PlaneGeometry(L.dims[0], L.dims[1]);
            // const tL = 1;
            // const uva = Float32Array.from([0, tL, tL, tL, 0, 0, tL*2, 0]);
            // geometry.setAttribute('uv', new THREE.BufferAttribute(uva,2));

            const material = new THREE.MeshBasicMaterial({
                color: 0xFFFFFF,
                transparent: true,
                side: THREE.DoubleSide,
                map: L.texture,
                depthTest: false,
                depthWrite: false,
                opacity:1.0
            });

            L.mesh = new THREE.Mesh(geometry, material);
            L.mesh.scale.setScalar(4.0);

            if(fmt.tick !== null) {
                const pos = tick_pos(fmt.tick_offset)[fmt.tick];
                L.mesh.position.fromArray(pos);
            }

            L.object.add(L.mesh);
            L.object.position.set(0,0,0);

            L.format = fmt;
            L.ready = true;

            //console.log(L);
        }
        const L = {
            ready: false,
            dims: [0,0],
            format: null,
            line_padding: null,
            object:null,
            mesh:null,
            texture: null,
            canvas: document.createElement('canvas'),
            init,
            update,
            reshape_geometry,
            render
        }
        return L
    },
    /**
    * @param {Object} l_args the labels object.
    */
    make(l_args=null){
        const label_format = {
            origin: new THREE.Vector3(),
            text_array: [{text:'defaults', size:0.05}, {text:'UngTexted 03', size:0.05}],
            tick: null,
            tick_offset: 0.0,
            tick_dashed: false,
            look_at_camera: false,
            range: false, // {max, min, interval}
            direction: null,
            align: 'center',
            line_padding: 24.0,
            baseline_visible: false,
            dynamic: null, // {anchor, position, position_offset}
        }
        //set from default params
        Object.entries(l_args).map(a => label_format[a[0]] = a[1]);

        if(label_format.range){
            labels.groups[label_format.name] = [];
            const divisions = Math.abs(label_format.range.min-label_format.range.max);
            const spread = Math.abs(label_format.range.start_value-label_format.range.end_value);



            console.log(divisions,spread);

            for (let n = label_format.range.min, i = 0; n <= label_format.range.max; n += label_format.range.interval, i++) {
                label_format.text_array = [{
                    text:label_format.range.start_value+((i*label_format.range.interval)*(spread/divisions)),
                    size:label_format.range.size
                }];
                const label = labels.label(label_format);
                label.look = label_format.look_at_camera;
                label.init(label_format);

                if(label_format.direction !== null){
                    vc.e.copy(directions[label_format.direction]);
                    vc.a.copy(label.mesh.position).add(vc.e);
                    label.mesh.lookAt(vc.a);
                }

                vc.a.fromArray(label_format.range.interval_vector).multiplyScalar(n).add(label_format.origin);
                label.object.position.copy(vc.a);
                labels.object.add(label.object);
                labels.groups[label_format.name].push(label);
                labels.all.push(label);
            }
            // for (let n = labels.bounds[axis][0]; n <= labels.bounds[axis][1]; n += interval) {
            //     const label = labels.label(n, tick);
            //     label.init();
            //     const interval_n = Math.abs(labels.bounds[axis][0]) + n;
            //     const interval_scale = labels.bounds[axis][0] === 0 ? labels.bounds[axis][1] / df.model.bounds[axis] : Math.abs(labels.bounds[axis][0]) / df.model.bounds[axis];
            //     label.look = do_look;
            //     label.object.position.copy(origin);
            //     label.object.position[axis] = interval_n / interval_scale;
            //     labels.object.add(label.object);
            //     labels.groups[axis].push(label);
            //     labels.all.push(label);
            // }
        }else{
            const label = labels.label(label_format);
            label.look = label_format.look_at_camera;
            label.init(label_format);

            if(label_format.direction !== null){
                vc.e.copy(directions[label_format.direction]);
                vc.a.copy(label.mesh.position).add(vc.e);
                label.mesh.lookAt(vc.a);
            }

            labels.groups[label_format.name] = label;
            label.object.position.copy(label_format.origin);
            label.format = label_format;

            labels.object.add(label.object);
            labels.all.push(label);
            return label;

        }
    },

    make_label_object(text){
        //
        // labels.bounds.y[1] = df.model.data_max;
        //
        // vc.a.set(0.0,0.0,(df.model.bounds.z*2.0)+1.0);
        // labels.render('x', 30.0, vc.a, 'I', true);
        //
        // vc.a.set(-1.0,0.0,0.0);
        // labels.render('z', 15.0, vc.a, 'R', true);
        //
        // vc.a.set(df.model.bounds.x+1.0,0.0,(df.model.bounds.z*2.0));
        // labels.render('y', 20.0, vc.a, 'L', true);
        //
        // vc.a.set(df.model.bounds.x,df.model.bounds.y+1.0,0.0);
        // labels.render(null, null, vc.a, 'B', 'GMT');
        //
        // vc.a.set(0.0,df.model.bounds.y+1.0,0.0);
        // labels.render(null, null, vc.a, 'B', 'GMT+24');
        //
        // vc.a.set(df.model.bounds.x+1.0, 0.0, df.model.bounds.z);
        // labels.render(null, null, vc.a, 'L', 'EQUATOR', false, 'up');
        //
        // vc.a.set((df.model.bounds.x/2.0),df.model.bounds.y+1.0,0.0);
        // labels.render(null, null, vc.a, 'B', 'NORTH', false);
        //
        // vc.a.set((df.model.bounds.x/2.0),0.0,(df.model.bounds.z*2.0)+2.0);
        // labels.render(null, null, vc.a, null, 'ºEAST', false, 'up');
        //
        // vc.a.set(df.model.bounds.x+2.0,df.model.bounds.y/2.0,(df.model.bounds.z*2.0));
        // labels.render(null, null, vc.a, null, 'CTIPe', false);
        //
        // df.model.world_bounds.add(labels.object);
        //
        // labels.init = true;
        //
        // console.log(labels.groups);
    },
}

const plane_text = (line_height, style, resolution, names='show-names') => {

    function get_text(){
        const lines = [];
        P.watch.map(o =>{
            if(o.hasOwnProperty('formatted')){
                o.lines.map(l =>{
                    lines.push(l);
                });
            } else {
                Object.entries(o).map(v => {
                    let str = P.names === 'show-names' ? `${v[0]}:` : '';
                    if (typeof (v[1]) === 'number') {
                        str += `${v[1] === null ? 'null' : v[1].toFixed(2)}`;
                    } else {
                        str += `${v[1]}`;
                    }
                    lines.push({text: str});
                });
            }
            lines.push({text:'break'});
        })
        return lines;
    }

    function init(){
        const g = P.canvas.getContext('2d');
        P.canvas.width = resolution;
        P.canvas.height = resolution;
        g.fillStyle = '#000000';
        g.fillRect(0, 0, P.canvas.width, P.canvas.height);
        P.texture = new THREE.Texture(P.canvas);

        const s_geometry = new THREE.PlaneGeometry(config.model_w, config.model_w);

        const s_material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            map: P.texture,
            blending: THREE.AdditiveBlending,
            depthTest: true,
            depthWrite: false
        });

        P.plane_object = new THREE.Mesh(s_geometry, s_material);

    }

    function trace(){
        const lines = P.get_text();
        const ref = lines.map(l=>l.text).join('-');
        if(ref === P.memory) return;

        //make bitmap
        const g = P.canvas.getContext('2d');

        g.fillStyle = '#000000';
        g.fillRect(0, 0, P.canvas.width, P.canvas.height);
        g.fillStyle = 'white';
        let y_pos = 0;


        lines.map((L,n) => {
            const l_height = L.size ? L.size : P.line_height;
            g.font = `${l_height}px heavy_data Helvetica`;
            g.textAlign = L.align ? L.align : 'left';
            const asc = g.measureText(L.text).fontBoundingBoxAscent;
            const hgt = g.measureText(L.text).fontBoundingBoxDescent;

            y_pos += asc+hgt;//l_height;
            const l_start = P.style === 'bottom-up' ? P.canvas.height-(lines.length*l_height) : 0.0;
            g.fillStyle = L.color ? L.color : 'white';
            if(L.text === 'break'){
                if(n !== lines.length-1){
                    g.fillRect(0, l_start+(y_pos), P.canvas.width, 2.0);
                }
            }else{
                g.fillText(L.text, g.textAlign === 'left' ? 0.0 : P.canvas.width , l_start+(y_pos-hgt));
            }
        });

        P.texture.needsUpdate = true;
        P.memory = ref;
    }

    const P = {
        plane_object: null,
        memory: null,
        watch: null,
        texture: null,
        canvas: document.createElement('canvas'),
        line_height: line_height,
        style: style,
        names:names,
        get_text,
        init,
        trace
    }

    return P;
}


export default labels;