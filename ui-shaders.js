export const overlay = {
	uniforms: {
		"tDiffuse": { type: "t", value: null },
		"alpha":   { type: "f", value: 1.0 },
	},
	vertexShader: `
		varying vec2 vUv;
		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,
	fragmentShader: `
		uniform sampler2D tDiffuse;
        uniform float alpha;
		varying vec2 vUv;
		void main() {
			vec4 cga = texture2D(tDiffuse, vUv);
			gl_FragColor = vec4(cga.r, cga.g, cga.b, alpha);
		}`
};
