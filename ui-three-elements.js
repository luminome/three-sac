import * as THREE from 'three';
import * as util from './ui-util';
const util_c = new THREE.Color();

const vc = {
    a: new THREE.Vector3(0, 0, 0),
    b: new THREE.Vector3(0, 0, 0),
    c: new THREE.Vector3(0, 0, 0),
    d: new THREE.Vector3(0, 0, 0),
    e: new THREE.Vector3(0, 0, 0)
}


const elements = {
    /**
    * @param {Object} params The Object
    */
    helper_axes(params){
        const view_axes = new THREE.AxesHelper(params.width / 2);
        view_axes.material.blending = THREE.AdditiveBlending;
        view_axes.material.transparent = true;
        return view_axes;
    },
    /**
    * @param {Object} params The Object
    */
    helper_grid(params){
        const arr = {};
        util_c.set(params.color).getHSL(arr);
        const r = params.width;
        const col_xy = util_c.clone().setHSL(arr.h, arr.s, arr.l*0.5);
        const col_gd = util_c.clone().setHSL(arr.h, arr.s, arr.l*0.25);
        const view_grid = new THREE.GridHelper(r, r, col_xy, col_gd);
        view_grid.material.blending = THREE.AdditiveBlending;
        view_grid.material.transparent = true;
        view_grid.renderOrder = 1;
        return view_grid;
    },
    /**
    * @param {Object} params The Object
    */
    world_position_lines(params){
        const material = new THREE.RawShaderMaterial({
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthTest: false,
            depthWrite: true,
            uniforms: {
                color: {
                    type: 'c',
                    value: new THREE.Color(params.color),
                },
                startOpacity: {
                    value: params.opacity,
                },
                limitDistance: {
                    value: params.distance,
                }
            },

            vertexShader: `
                precision highp float;
                attribute vec2 uv;
                attribute vec4 position;
                varying vec4 vPos;
                uniform mat4 projectionMatrix;
                uniform mat4 modelViewMatrix;
                void main() {
                  vPos = position;
                  gl_Position = projectionMatrix * modelViewMatrix * position;
                }
            `,
            fragmentShader: `
                precision highp float;
                uniform vec3 color;
                uniform float opacity;
                uniform float startOpacity;
                uniform float limitDistance;
                varying vec4 vPos;
                void main() {
                  float distance = clamp(length(vPos), 0., limitDistance);
                  float opacity = startOpacity - distance / limitDistance;
                  gl_FragColor = vec4(color, opacity);
                }
            `
        });
        const axis_line_group = new THREE.Object3D();
        const vertices = [
            -1,0,0,
            1,0,0,
            0,0,-1,
            0,0,1,
            0,0,0,
            0,-1,0,
        ]

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute( 'position', new THREE.BufferAttribute( new Float32Array(vertices), 3 ) );
        geometry.scale(20, 20, 20);

        const line = new THREE.LineSegments( geometry, material );
        axis_line_group.add(line);

        return axis_line_group;
    },
    /**
    * @param {Object} params The Object
    */
    grid_marks(params){
        const plush_material = new THREE.ShaderMaterial({
            depthTest: true,
            depthWrite: true,
            uniforms: {
                level: {
                    type:'c',
                    value: params.distance,
                },
                base_color:{
                    type:'c',
                    value: new THREE.Color(params.base_color)
                }
            },
            vertexShader: `
                uniform vec3 base_color;
                uniform float level;
                attribute vec3 color;
                varying float vOpacity;
                varying vec3 vColor;
                varying vec3 vBaseColor;
                void main() {
                    vColor = color;
                    vBaseColor = base_color;
                    vec4 mvPosition = viewMatrix * modelMatrix * instanceMatrix * vec4( position, 1.0);
                    vOpacity = 1.0 - (1.0 / (level / -mvPosition.z));
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                precision highp float;
                varying float vOpacity;
                varying vec3 vColor;
                varying vec3 vBaseColor;
                void main() {
                    vec3 std = vBaseColor + (vColor * vOpacity);
                    gl_FragColor = vec4( std, 1.0 );
                    if( vOpacity < 0.05) discard;
                }
            `
        });


        const width = params.width;
        const count = Math.pow(width+1, 2);
        const ds = params.shape_scale;
        const s = params.pitch;
        const L = params.shape_length;

        const plush3dVertices = new Float32Array([
            1.0, L, 1.0,
            1.0, 1.0, 1.0,
            L, 1.0, 1.0,
            L, -1.0, 1.0,
            1.0, -1.0, 1.0,
            1.0, -L, 1.0,
            -1.0, -L, 1.0,
            -1.0, -1.0, 1.0,
            -L, -1.0, 1.0,
            -L, 1.0, 1.0,
            -1.0, 1.0, 1.0,
            -1.0, L, 1.0,

            1.0, L, -1.0,
            1.0, 1.0, -1.0,
            L, 1.0, -1.0,
            L, -1.0, -1.0,
            1.0, -1.0, -1.0,
            1.0, -L, -1.0,
            -1.0, -L, -1.0,
            -1.0, -1.0, -1.0,
            -L, -1.0, -1.0,
            -L, 1.0, -1.0,
            -1.0, 1.0, -1.0,
            -1.0, L, -1.0,

        ]);
        const plush3dIndices = new Uint16Array([
            //front
            0,11,5,
            11,6,5,
            2,1,3,
            1,4,3,
            10,9,7,
            9,8,7,
            //sides
            0,1,13,
            13,12,0,

            1,2,14,
            14,13,1,

            2,3,15,
            15,14,2,

            3,4,16,
            16,15,3,

            4,5,17,
            17,16,4,

            5,6,18,
            18,17,5,

            6,7,19,
            19,18,6,

            7,8,20,
            20,19,7,

            8,9,21,
            21,20,8,

            9,10,22,
            22,21,9,

            10,11,23,
            23,22,10,

            0,12,23,
            23,11,0,
            //back
            12,17,18,
            18,23,12,
            13,14,15,
            15,16,13,
            21,22,19,
            19,20,21
        ]);
        const plushColors = new Float32Array(plush3dVertices.length);
        plushColors.fill(0.5);
        const f_color = [];
        util_c.set(params.color).toArray(f_color);

        for(let i = 0; i < count; i++){
            util.set_buffer_at_index(plushColors,i,f_color);
        }

        let mesh_geometry = new THREE.BufferGeometry();
        mesh_geometry.setAttribute("position", new THREE.BufferAttribute(plush3dVertices, 3, false));
        mesh_geometry.setAttribute("color", new THREE.BufferAttribute(plushColors, 3, false));
        mesh_geometry.setIndex(new THREE.BufferAttribute(plush3dIndices, 1, false));
        mesh_geometry.computeVertexNormals();

        mesh_geometry.scale(ds,ds,ds);
        mesh_geometry.rotateX( Math.PI / 2);

        const plush_mesh = new THREE.InstancedMesh(mesh_geometry, plush_material, count);
        plush_mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

        const dummy = new THREE.Object3D();

        for(let i = 0; i <= width; i++){
            for(let j = 0; j <= width; j++){
                const x = ((width/-2.0) + i)*s;
                const y = ((width/-2.0) + j)*s;
                dummy.position.set(x,0,y);
                dummy.updateMatrix();
                plush_mesh.setMatrixAt(i*(width+1)+j, dummy.matrix);
            }
        }

        plush_mesh.instanceMatrix.needsUpdate = true;
        // model.objects.grid_marks = plush_mesh;
        // model.add(plush_mesh);

        return plush_mesh;
    },
    /**
    * @param {Number} radius The Object
    */
    dashed_halo(radius) {
        const curve = new THREE.EllipseCurve(
            0, 0,            // ax, aY
            radius, radius,           // xRadius, yRadius
            0, 2 * Math.PI,  // aStartAngle, aEndAngle
            true,            // aClockwise
            0                 // aRotation
        );

        curve.updateArcLengths();

        const points = curve.getPoints(201);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);

        const material = new THREE.LineDashedMaterial({
            color: 0x666666,
            scale: 1,
            dashSize: radius * 0.1,
            gapSize: radius * 0.1,
        });

        // Create the final object to add to the scene
        const line = new THREE.Line(geometry, material);
        line.userData.radius = radius;
        line.computeLineDistances();
        line.rotateX(Math.PI / 2);
        return line;
    },
    dom_label(){
        const base_css = `
            position:absolute;
        `;

        /**
        * @param {Object} dom_target The Object
        * @param {Object} params The Object
        */
        function init(dom_target, params){
            const mark = document.createElement('div');
            mark.innerHTML = '0.0';
            mark.style.color = params.color;//'gray';//vars.colors.hex_css(vars.colors.chart_tick);
            mark.style.backgroundColor = params.background_color;
            mark.style.fontSize = params.font_size;
            mark.style.cssText += base_css;
            dom_target.appendChild(mark);
            L.object = mark;
            L.dom_rect = mark.getBoundingClientRect();
            return L;
        }

        function set_position(x_px, y_px){
            L.position.set(x_px, y_px);
            L.object.style.left = x_px-(L.dom_rect.width/2)+'px';
            L.object.style.top = y_px-(L.dom_rect.height/2)+'px';
        }

        function set_text(string){
            L.object.innerHTML = string;
            L.dom_rect = L.object.getBoundingClientRect();
            L.set_position(L.position.x, L.position.y);
        }

        const L = {
            object: null,
            dom_rect: null,
            position: new THREE.Vector2(0,0),
            init,
            set_position,
            set_text
        }

        return L;
    },
    position_marker(){
        const vertices = [
            -1,0,0,
            1,0,0,
            0,0,-1,
            0,0,1,
        ]
        const material = new THREE.LineBasicMaterial({color: 0xFFFFFF});
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute( 'position', new THREE.BufferAttribute( new Float32Array(vertices), 3 ) );
        return new THREE.LineSegments( geometry, material );
    },
}


export default elements;
