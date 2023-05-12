import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';

import {dragControls} from './evt-mouse-touch.js';
import {keyControls} from './evt-keys.js';
import * as shaders from './ui-shaders.js';
import Stats from 'stats.js';


let renderer, overlay_composer, layer_one, layer_two, stats

const util_v = new THREE.Vector3();
const y_up = new THREE.Vector3(0, 1, 0);
const evt_reactivity = 200;
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//EVENT SPECIFIC
const touch = {
    x: null,
    y: null,
    last: {
        x: 0,
        y: 0
    },
    delta: {
        x: 0,
        y: 0
    },
    origin: {
        x: 0,
        y: 0
    },
    origin_last: {
        x: 0,
        y: 0
    },
    origin_delta: {
        x: 0,
        y: 0
    }
}
function keys_event(raw_keys_arr, o){
    o.keys.active = [...raw_keys_arr];
    if(o.update_function !== null) o.update_function('keys');
    o.keys.previous = [...o.keys.active];
    return true;
}
function screen_event(type, o){
    const m = o.screen;

    m.meta.delta_x = false;
    m.meta.delta_y = false;
    m.meta.roto_x = false;
    m.meta.roto_y = false;
    m.meta.scale_z = false;
    m.meta.pos_x = false;
    m.meta.pos_y = false;
    m.meta.action = false;
    m.meta.interact_type = m.pointer.event_type;

    if (m.pointer.event_type === 'touch') {
        m.meta.action = m.pointer.action;
        const primary = m.pointer.touches[0];
        if (m.pointer.touches.length > 1) {
            const secondary = m.pointer.touches[1];
            const x_o = primary.x - secondary.x;
            const y_o = primary.y - secondary.y;
            touch.last.x = touch.x;
            touch.last.y = touch.y;
            touch.x = primary.x - (x_o / 2);
            touch.y = primary.y - (y_o / 2);
            touch.delta.x = touch.last.x === null ? 0 : touch.x - touch.last.x;
            touch.delta.y = touch.last.y === null ? 0 : touch.y - touch.last.y;

            if (m.pointer.action === 'secondary-down') {
                touch.origin.x = touch.x;
                touch.origin.y = touch.y;
            }

            touch.origin_delta.x = touch.origin_last.x - (touch.origin.x - touch.x);
            touch.origin_delta.y = touch.origin_last.y - (touch.origin.y - touch.y);
            touch.origin_last.x = touch.origin.x - touch.x;
            touch.origin_last.y = touch.origin.y - touch.y;

            m.meta.roto_x = m.pointer.angle_delta;
            m.meta.roto_y = touch.origin_delta.y / 100.0;
            m.meta.pos_x = touch.x;
            m.meta.pos_y = touch.y;
            m.meta.delta_x = touch.delta.x;
            m.meta.delta_y = touch.delta.y;
            m.meta.scale_z = 1.0 + m.pointer.dist_delta;

        } else if (m.pointer.touches.length === 1) {
            m.meta.pos_x = primary.x;
            m.meta.pos_y = primary.y;
            m.meta.delta_x = primary.x_d;
            m.meta.delta_y = primary.y_d;
            touch.x = null;
            touch.y = null;
        } else {
            m.meta.pos_x = m.pointer.x;
            m.meta.pos_y = m.pointer.y;
        }

    }

    if (m.pointer.event_type === 'mouse') {

        m.meta.pos_x = m.pointer.actual.x;
        m.meta.pos_y = m.pointer.actual.y;

        m.meta.action = type;

        if (m.pointer.down === true) {
            if (m.pointer.button === 2 || o.keys.active.includes('ShiftLeft') || o.keys.active.includes('ShiftRight')) {
                m.meta.roto_x = m.pointer.delta.x / evt_reactivity;
                m.meta.roto_y = m.pointer.delta.y / evt_reactivity;
            } else {
                m.meta.delta_x = m.pointer.delta.x;
                m.meta.delta_y = m.pointer.delta.y;
            }
        }

        if (m.meta.action === 'scroll') {
            m.meta.scale_z = 1 + (m.pointer.wheel_delta.y / evt_reactivity);
        }
    }

    if(o.update_function !== null) o.update_function('screen');
    return true;
}
function register_event(type){
    if(type === 'screen'){
        //console.log(events.vars.callback[type].meta);
        controls.update(events.vars.callback[type].meta, environment.v.model);
        controls.cam.run();
    }
    environment.v.event_callback(type, events.vars.callback[type]);
}
const events = {
    vars:{
        callback:{
            update_function: register_event,
            toggle: true,
            keys:{
                active: [],
                previous: []
            },
            screen:{
                meta:{
                    action: false,
                    roto_x: false,
                    roto_y: false,
                    pos_x: false,
                    pos_y: false,
                    delta_x: false,
                    delta_y: false,
                    scale_z: false
                },
                pointer:{

                }
            },
            report(data){
                console.log(data);
            }
        },
    },
    init(dom_element = document.body) {
        dragControls(dom_element, screen_event, events.vars.callback);
        keyControls(window, keys_event, events.vars.callback);
    }
}
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//CAMERA AND CONTROL SPECIFIC
const cam = {
    camera: null,
    euler: new THREE.Euler(),
    applied_rotations:{
        x: 0.0,
        y: 0.0
    },
    constrain_rotation: true,
    constrain_v: new THREE.Vector3(0, 0, 0),
    constrain_angle: 0.0,
    default_z: 10,
    default_reset_z: 10,
    root_plane: new THREE.Plane(y_up, 0),
    base_pos: new THREE.Vector3(0, 0, 10),
    pos: new THREE.Vector3(0, 0, 0),
    projected: new THREE.Vector3(0, 0, 0),
    event_origin: new THREE.Vector3(0, 0, 0),
    distance: 1.0,
    min_zoom: 0.25,
    max_zoom: 20.0,
    scale: 1.0,
    camera_scale: 1.0,
    frustum: new THREE.Frustum(),
    frustum_mat: new THREE.Matrix4(),
    direction: new THREE.Vector3(0, 0, 0),
    right: new THREE.Vector3(0, 0, 0),
    dot_x: new THREE.Vector3(0, 0, 0),
    dot_y: new THREE.Vector3(0, 0, 0),
    dot_z: new THREE.Vector3(0, 0, 0),
    util_v: new THREE.Vector3(0, 0, 0),
    cube: null,
    model_view_bounds:{w:null, h:null},
    init(){
        const cube_box = new THREE.BoxGeometry(2, 2, 2);
        cam.cube = new THREE.Mesh(cube_box, new THREE.MeshStandardMaterial({color: 0xffffff}));
        cam.cube.rotateX(Math.PI*-0.5);
        cam.cube.updateMatrix();
        cam.cube.updateMatrixWorld();
        cam.cube.userData.originalMatrix = cam.cube.matrix.clone();
    },
    run() {
        cam.util_v.copy(cam.base_pos).applyQuaternion(cam.cube.quaternion);
        cam.pos.copy(cam.util_v);
        cam.util_v.copy(y_up).applyQuaternion(cam.cube.quaternion);
        cam.camera.up.copy(cam.util_v);
        cam.camera.position.copy(cam.pos);

        cam.util_v.set(0,0,0);
        cam.camera.lookAt(cam.util_v);

        cam.camera.getWorldDirection(cam.util_v);
        cam.direction.copy(cam.util_v);

        cam.right.crossVectors(cam.util_v, cam.camera.up).normalize();
        // cam.dot_y = cam.camera.up.dot(y_up);
        // cam.dot_x = cam.right.dot(x_right);
        // cam.dot_z = z_in.dot(cam.util_v);

        cam.distance = cam.camera.position.length();

        cam.constrain_v.copy(y_up).applyAxisAngle(cam.right, Math.PI/-4);
        cam.constrain_angle = cam.pos.angleTo(cam.constrain_v);// * Math.sign(cam.constrain_v.dot(cam.pos));

        cam.max_zoom = environment.v.max_allowable_zoom;
        cam.camera_scale = (cam.distance / cam.max_zoom);

        cam.camera.updateProjectionMatrix();
        cam.camera.updateMatrixWorld();
        cam.camera.updateMatrix();
        cam.frustum.setFromProjectionMatrix(cam.frustum_mat.multiplyMatrices(cam.camera.projectionMatrix, cam.camera.matrixWorldInverse));
    }
}
const controls = {
    ray_caster: new THREE.Raycaster(),
    cam: null,
    interact_type: null,
    v:{
        user:{
            mouse:{
                state: null,
                raw: new THREE.Vector3(0, 0, 0),
                screen: new THREE.Vector2(0, 0),
                plane_pos: new THREE.Vector3(0, 0, 0),
                last_down: new THREE.Vector3(0, 0, 0),
                new_down: new THREE.Vector3(0, 0, 0),
                origin_pos: new THREE.Vector3(0, 0, 0),
                actual: new THREE.Vector3(0, 0, 0),
            }
        },
        cube:{
            rotation: new THREE.Vector2(0, 0)
        },
        view:{

        }
    },
    init(vars){
        // controls.v.view.width = vars.view.width;
        // controls.v.view.height = vars.view.height;
        controls.cam = cam;
        controls.cam.init();
        controls.ray_caster.params = {
            Line: {threshold: 0.01},
            Points: {threshold: 3.0},
        }
        controls.v.plane = new THREE.Plane(y_up);
    },
    update(e_meta, model){
        controls.interact_type = e_meta.interact_type;
        controls.v.user.mouse.state = e_meta.action;
        controls.v.user.mouse.raw.x = (e_meta.pos_x / environment.w) * 2 - 1;
        controls.v.user.mouse.raw.y = -(e_meta.pos_y / environment.h) * 2 + 1;
        controls.v.user.mouse.raw.z = 0.0;
        controls.v.user.mouse.screen.set(e_meta.pos_x, e_meta.pos_y);//.z = 0.0;
        controls.ray_caster.setFromCamera(controls.v.user.mouse.raw, controls.cam.camera);
        controls.ray_caster.ray.intersectPlane(controls.v.plane, controls.v.user.mouse.plane_pos);

        if (e_meta.action === 'down' || e_meta.action === 'secondary-down' || e_meta.action === 'secondary-up') {
            controls.v.user.mouse.last_down.copy(controls.v.user.mouse.plane_pos);
            controls.v.user.mouse.origin_pos.copy(model.position);
        }

        if (e_meta.roto_x || e_meta.roto_y) {
            controls.cam.cube.rotateOnWorldAxis(y_up, e_meta.roto_x);
            //if(environment.v.constrain_rotation){
            if(controls.cam.constrain_rotation){
                if(controls.cam.constrain_angle+e_meta.roto_y < (Math.PI*0.75) && controls.cam.constrain_angle+e_meta.roto_y > (Math.PI*0.25)){
                    controls.cam.cube.rotateX(e_meta.roto_y);
                }
            }else{
                controls.cam.cube.rotateX(e_meta.roto_y);
            }
            controls.cam.cube.updateMatrixWorld();
        }

        if (e_meta.delta_x || e_meta.delta_y) {
            controls.v.user.mouse.new_down.copy(controls.v.user.mouse.plane_pos);
            controls.v.user.mouse.actual.copy(controls.v.user.mouse.new_down.sub(controls.v.user.mouse.last_down));
            
            if(environment.v.drag_enabled){
                model.position.copy(controls.v.user.mouse.actual.add(controls.v.user.mouse.origin_pos));
            }
        }

        if (e_meta.scale_z) {
            if (controls.cam.base_pos.z*e_meta.scale_z < controls.cam.min_zoom) {
                controls.cam.base_pos.z = controls.cam.min_zoom;
            } else if (controls.cam.base_pos.z*e_meta.scale_z > controls.cam.max_zoom) {
                controls.cam.base_pos.z = controls.cam.max_zoom;
            } else {
                controls.cam.base_pos.multiplyScalar(e_meta.scale_z);
                if(environment.v.drag_enabled){
                    util_v.copy(controls.v.user.mouse.plane_pos).multiplyScalar(1 - e_meta.scale_z);
                    controls.v.user.mouse.plane_pos.sub(util_v);
                    model.position.sub(util_v);
                }
            }
        }

        model.updateMatrix();
        model.updateMatrixWorld();

        if(environment.v.model_overlay) {
            environment.v.model_overlay.matrix.copy(environment.v.model.matrix);
            environment.v.model_overlay.position.copy(environment.v.model.position);
            environment.v.model_overlay.updateMatrix();
            environment.v.model_overlay.updateMatrixWorld();
        }

        // controls.cam.run();
    },
    reset(){

    }
}
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//RUNTIME SPECIFIC
class LayerSimple {
	constructor() {
		this.scene = new THREE.Scene();
	}
}
class LayerComplex {
    constructor(camera) {
        this.scene = new THREE.Scene();
        this.renderPass = new RenderPass(this.scene, camera);
        this.renderPass.clear = true;
        this.renderPass.autoClear = false;
        this.renderPass.clearDepth = false;
        this.renderPass.renderToScreen = true;
        this.renderPass.clearAlpha = 0.0;
        this.renderPass.clearColor = 0x00FF00;

        this.shaderPass = new ShaderPass( shaders.overlay );
        this.shaderPass.material.uniforms[ 'alpha' ].value = 0.5;
        this.shaderPass.renderToScreen = true;
        this.shaderPass.autoClear = true;
        this.shaderPass.clear = true;
        // this.shaderPass.clearAlpha = 0.0;
        // this.shaderPass.clearColor = 0x00FF00;
        this.shaderPass.material.transparent = true;
        this.shaderPass.material.blending = THREE.AdditiveBlending;
    }
}

const visibleAtZDepth = (depth, camera) => {
    // compensate for cameras not positioned at z=0
    const cameraOffset = camera.position.z;
    if (depth < cameraOffset) depth -= cameraOffset;
    else depth += cameraOffset;

    // vertical fov in radians
    const vFOV = camera.fov * Math.PI / 180;

    // Math.abs to ensure the result is always positive
    const vis_ht = 2 * Math.tan(vFOV / 2) * Math.abs(depth);
    return {'h': vis_ht, 'w': vis_ht * camera.aspect};
};
function init(){
    //watched
    events.init(environment.dom);
    controls.init(environment.v);
    controls.cam.camera = new THREE.PerspectiveCamera(60, environment.w / environment.h, 0.1, 80);
    renderer = new THREE.WebGLRenderer({
        powerPreference: "high-performance",
        antialias: true,
        physicallyCorrectLights: true,
        alpha: false,
        stencilBuffer: false,
        // localClippingEnabled: true
    });

    renderer.localClippingEnabled = true;
    

    controls.cam.run();
    
    renderer.setPixelRatio(1);
    renderer.setClearColor( 0x000000, 0 );
    renderer.autoClear = false;

    const light = new THREE.PointLight(0xFFFFFF, 6.0, environment.v.model_w * 6);
    light.position.set(0, environment.v.model_w*2.0, 0);
    const ambient_light = new THREE.AmbientLight( 0xFFFFFF ); // soft white light
    // scene.add( ambient_light );
    // environment.dom.appendChild(renderer.domElement);
    // environment.vars.dom = renderer.domElement;

    environment.dom.appendChild(renderer.domElement);
    resize();


    stats = new Stats;
    if(environment.v.stats){
        stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
        environment.dom.appendChild( stats.dom );
    }

	layer_one = new LayerSimple();
    layer_one.scene.background = new THREE.Color(environment.v.view.colors.window_background);
	layer_one.scene.add( light );
	layer_one.scene.add( ambient_light );
    layer_one.scene.add( environment.v.model );

    environment.layers.push(layer_one);

    if(environment.v.model_overlay){

        const fxaaPass = new ShaderPass( FXAAShader );
        fxaaPass.material.uniforms[ 'resolution' ].value.x = 1 / ( environment.w * 2 );
        fxaaPass.material.uniforms[ 'resolution' ].value.y = 1 / ( environment.h * 2 );

        overlay_composer = new EffectComposer( renderer );
        layer_two = new LayerComplex(controls.cam.camera);
        layer_two.scene.add( environment.v.model_overlay );
        environment.layers.push(layer_two);

        overlay_composer.addPass( layer_two.renderPass );
        overlay_composer.addPass( fxaaPass );
        overlay_composer.addPass( layer_two.shaderPass );

    }


    //controls.reset();
    window.addEventListener('resize', resize);
}
function post_init(type='screen') {
    console.log('post_init check 0');
    // register_event(type);
    // environment.controls.update(events.vars.callback[type].meta, environment.v.model);
    environment.controls.cam.run();
}
function render(a) {
    renderer.clear();
    renderer.render(environment.layers[0].scene, environment.controls.cam.camera);
    if(environment.v.model_overlay) {
        //renderer.clearDepth();
        // environment.v.model.updateMatrixWorld();
        // environment.v.model.updateMatrix();



        overlay_composer.render();
    }
}
function animate(f) {
    stats.begin();
    environment.frame = requestAnimationFrame(animate);
    render(f);
    if(environment.v.animation_callback !== null) environment.v.animation_callback(f);

    stats.end();
}
function resize(){

    const dims = environment.dom.getBoundingClientRect();

    environment.w = dims.width;//window.innerWidth;
    environment.h = dims.height;//window.innerHeight;

    renderer.setSize(environment.w, environment.h);
    controls.cam.camera.aspect = environment.w / environment.h;
    controls.cam.camera.updateProjectionMatrix();

    const default_view_z = environment.v.default_camera_z;
    const vis_limit = visibleAtZDepth(-default_view_z, controls.cam.camera);
    environment.v.model_visible_dimensions = environment.w > environment.h ? vis_limit.h : vis_limit.w;
    environment.v.max_allowable_zoom = ((default_view_z / environment.v.model_visible_dimensions) * (environment.v.model_w)) + 2.0;
    controls.cam.base_pos.z = environment.v.max_allowable_zoom;
    controls.cam.max_zoom = environment.v.max_allowable_zoom;


}

const environment = {
    w: null,
    h: null,
    objects:{},
    frame: 0,
    fps: 0,
    init(dom, config_vars){
        environment.controls = controls;
        environment.v = config_vars;
        environment.dom = dom;
        environment.layers = [];
        init();
        post_init();
        animate();
    },
    resize,
    visibleAtZDepth
}


export default environment;