import * as THREE from 'three';
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
    label(){
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
                vc.a.copy(fmt.dynamic.anchor);
                L.object.worldToLocal(vc.a);
                vc.b.copy(vc.a).normalize().multiplyScalar(-fmt.tick_offset);
                vc.c.copy(vc.a).normalize().multiplyScalar(-fmt.dynamic.offset);
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

            L.texture = new THREE.Texture(L.canvas);
            L.texture.repeat.set(L.dims[0], L.dims[1]);
            L.texture.offset.y = 1.0-L.dims[1];
            L.texture.needsUpdate = true;

            const geometry = new THREE.PlaneGeometry(L.dims[0], L.dims[1]);

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

            for (let n = label_format.range.min, i = 0; n <= label_format.range.max; n += label_format.range.interval, i++) {
                label_format.text_array = [{
                    text:label_format.range.start_value+((i*label_format.range.interval)*(spread/divisions)),
                    size:label_format.range.size
                }];
                const label = labels.label();
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

        }else{
            const label = labels.label();
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
    }
}

const trace = () => {

    function get_text(){
        const lines = [];
        T.watch.map(o =>{
            if(o.hasOwnProperty('formatted')){
                o.lines.map(l =>{
                    lines.push(l);
                });
            } else {
                Object.entries(o).map(v => {
                    let str = T.names === 'show-names' ? `${v[0]}:` : '';
                    if (typeof (v[1]) === 'number') {
                        str += `${v[1] === null ? 'null' : v[1].toFixed(2)}`;
                    } else {
                        str += `${v[1]}`;
                    }
                    lines.push({text: str});
                });
            }
            lines.push({text:'break', 'size': 0.1});
        })
        return lines;
    }

    function get_trace(){
        // check if same data as before
        const lines = T.get_text();
        const ref = lines.map(l=>l.text).join('-');
        if(ref === T.memory) return;
        T.memory = ref;
        return lines;
    }

    const T = {
        memory: null,
        watch: null,
        names: 'show-names',
        get_text,
        get_trace
    }

    return T
}




export {labels, trace};