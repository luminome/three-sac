const config = {
    stats: true,
    test: false,
    view: {
        colors:{
            window_background: 0x222222,
        },
        dom_labels:{
            color: '#444444',
            background_color: '#222222',
            font_size: 8,
        },
        features: {
            grid_marks:{
                on: true,
                target: 'model',
                distance: 20.0,
                width: 20,
                pitch: 2.0,
                shape_length: 5.0,
                shape_scale: 0.01,
                color: 0x444444,
                base_color: 0x222222
            },
            world_position_lines:{
                on: true,
                target: 'scene',
                color: 0x333333,
                opacity: 0.9,
                distance: 20.0,
            },
            helper_grid:{
                on: true,
                target: 'model',
                color: 0x333333,
                width: 20
            },
            helper_axes:{
                on: false,
                width: 20
            },
            position_marker:{
                on: true,
            }
        }
    },
    model_w: 20.0,
    model_h: 20.0,
    model_resolution: 3,
    default_camera_z: 20.0,
    default_camera_pos: [0,10,0],
    event_callback: null,
    animation_callback: null,
    debug:{}
}

export default config