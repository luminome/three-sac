import * as THREE from 'three';

const labels = {
    ready: false,
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
    label(text, tick=null){
        function update(){
            const g = L.canvas.getContext('2d');
            L.canvas.width = 256;
            L.canvas.height = 256;
            g.fillStyle = '#000000';
            g.fillRect(0, 0, L.canvas.width, L.canvas.height);
            g.font = `${L.line_height}px heavy_data`;
            g.fillStyle = 'white';

            const wid = g.measureText(L.text).width;
            const asc = g.measureText(L.text).actualBoundingBoxAscent;
            const hgt = asc+g.measureText(L.text).actualBoundingBoxDescent;

            g.fillText(L.text, L.canvas.width/2 - wid/2, L.canvas.height/2 + hgt/2);

            if(L.texture) L.texture.needsUpdate = true;

            //#// nice canvas-based ticks here
            /*
            if(L.tick !== null) {
                const t_x = [0.0, 0.0];
                const t_y = [0.0, 0.0];
                const px = L.canvas.width / 2;
                const py = L.canvas.height / 2;

                switch (L.tick) {
                    case 'L':
                        t_x[0] = 0.0;
                        t_y[0] = py;
                        t_x[1] = (px - wid/2) - (L.line_height / 6.0);
                        t_y[1] = py;
                        break;
                    case 'R':
                        t_x[0] = (px + wid/2) + (L.line_height / 6.0);
                        t_y[0] = py;
                        t_x[1] = L.canvas.width;
                        t_y[1] = py;
                        break;
                    case 'T':
                        t_x[0] = px;
                        t_y[0] = (py - asc) - (L.line_height / 6.0);
                        t_x[1] = px;
                        t_y[1] = 0.0;
                        break;
                    case 'B':
                        t_x[0] = px;
                        t_y[0] = (py + hgt / 2) + (L.line_height / 6.0);
                        t_x[1] = px;
                        t_y[1] = L.canvas.height;
                        break;
                }


                g.strokeStyle = 'white';
                g.lineWidth = 2.5;
                // draw a red line
                g.beginPath();
                g.moveTo(t_x[0], t_y[0]);
                g.lineTo(t_x[1], t_y[1]);
                g.stroke();
            }
            */
        }
        function init(){

            L.update();
            L.object = new THREE.Group();
            //#//Vector line based ticks handler;
            if(L.tick !== null) {
                let k_flo;

                switch (L.tick) {
                    case 'L':
                        k_flo = [-2.0,0,0,-1,0,0];
                        break;
                    case 'R':
                        k_flo = [1.0,0,0,2.0,0,0];
                        break;
                    case 'T':
                        k_flo = [0,1.0,0,0,2.0,0];
                        break;
                    case 'B':
                        k_flo = [0,-1.0,0,0,-2.0,0];
                        break;
                    case 'I':
                        k_flo = [0,0.0,-1.0,0,0,-2.0];
                        break;
                    case 'O':
                        k_flo = [0,0.0,1.0,0,0,2.0];
                        break;
                }

                const line_pos = Float32Array.from(k_flo, z => z*0.5);
                const t_geometry = new THREE.BufferGeometry();
                t_geometry.setAttribute('position', new THREE.BufferAttribute(line_pos, 3));
                const t_material = new THREE.LineBasicMaterial({
                    color: 0x666666
                });

                L.line = new THREE.Line(t_geometry, t_material);
                L.object.add(L.line);
            }

            L.texture = new THREE.Texture(L.canvas);
            L.texture.needsUpdate = true;

            const l_geometry = new THREE.PlaneGeometry(2,2);
            const l_material = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                blending: THREE.AdditiveBlending,
                map: L.texture,
                depthTest: true,
                depthWrite: false,
                opacity:1.0
            });

            L.mesh = new THREE.Mesh(l_geometry, l_material);
            L.object.add(L.mesh);

        }
        const L = {
            object:null,
            mesh:null,
            text:text,
            tick: tick,
            texture: null,
            canvas: document.createElement('canvas'),
            line_height: 48,
            init,
            update
        }
        return L
    },
    render(axis, interval, origin, tick, is_range, do_look=true, faces=null){
        if(is_range === true) {
            labels.groups[axis] = [];
            for (let n = labels.bounds[axis][0]; n <= labels.bounds[axis][1]; n += interval) {
                const label = labels.label(n, tick);
                label.init();
                const interval_n = Math.abs(labels.bounds[axis][0]) + n;
                const interval_scale = labels.bounds[axis][0] === 0 ? labels.bounds[axis][1] / df.model.bounds[axis] : Math.abs(labels.bounds[axis][0]) / df.model.bounds[axis];
                label.look = do_look;
                label.object.position.copy(origin);
                label.object.position[axis] = interval_n / interval_scale;
                labels.object.add(label.object);

                labels.groups[axis].push(label);

                labels.all.push(label);
            }
        }else{
            const label = labels.label(is_range, tick);
            label.init();
            label.look = do_look;
            if(faces!==null){
                vc.e.copy(directions[faces]);
                label.mesh.lookAt(vc.e);
            }
            label.object.position.copy(origin);
            labels.object.add(label.object);
            labels.all.push(label);
            return label;
        }
    },

    make_label_object(text){

        labels.bounds.y[1] = df.model.data_max;

        vc.a.set(0.0,0.0,(df.model.bounds.z*2.0)+1.0);
        labels.render('x', 30.0, vc.a, 'I', true);

        vc.a.set(-1.0,0.0,0.0);
        labels.render('z', 15.0, vc.a, 'R', true);

        vc.a.set(df.model.bounds.x+1.0,0.0,(df.model.bounds.z*2.0));
        labels.render('y', 20.0, vc.a, 'L', true);

        vc.a.set(df.model.bounds.x,df.model.bounds.y+1.0,0.0);
        labels.render(null, null, vc.a, 'B', 'GMT');

        vc.a.set(0.0,df.model.bounds.y+1.0,0.0);
        labels.render(null, null, vc.a, 'B', 'GMT+24');

        vc.a.set(df.model.bounds.x+1.0, 0.0, df.model.bounds.z);
        labels.render(null, null, vc.a, 'L', 'EQUATOR', false, 'up');

        vc.a.set((df.model.bounds.x/2.0),df.model.bounds.y+1.0,0.0);
        labels.render(null, null, vc.a, 'B', 'NORTH', false);

        vc.a.set((df.model.bounds.x/2.0),0.0,(df.model.bounds.z*2.0)+2.0);
        labels.render(null, null, vc.a, null, 'ºEAST', false, 'up');

        vc.a.set(df.model.bounds.x+2.0,df.model.bounds.y/2.0,(df.model.bounds.z*2.0));
        labels.render(null, null, vc.a, null, 'CTIPe', false);

        df.model.world_bounds.add(labels.object);

        labels.init = true;

        console.log(labels.groups);
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
            g.font = `${l_height}px heavy_data`;
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
