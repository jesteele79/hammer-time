import { Vector2, type Texture } from "three";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

/** The ink's black, the game's outline over the lit set. */
const INK = "vec3(0.02, 0.018, 0.016)";

/**
 * The game's black lines on the set: where its normals or its depth break between a pixel and its neighbors, scaled by the
 * screen's density, never where the mask is white (the painted people keep their own lines).
 */
export function createInkPass(targets: { normal: Texture; depth: Texture; mask: Texture }, near: number, far: number): ShaderPass {
  const pass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      tNormal: { value: null },
      tDepth: { value: null },
      tMask: { value: null },
      texel: { value: new Vector2() },
      near: { value: near },
      far: { value: far },
    },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader: `
      varying vec2 vUv;
      uniform sampler2D tDiffuse, tNormal, tDepth, tMask;
      uniform vec2 texel;
      uniform float near, far;
      float view(vec2 uv) {
        float z = texture2D(tDepth, uv).x * 2.0 - 1.0;
        return 2.0 * near * far / (far + near - z * (far - near));
      }
      void main() {
        vec4 base = texture2D(tDiffuse, vUv);
        if (texture2D(tMask, vUv).r > 0.5) { gl_FragColor = base; return; }
        vec2 dx = vec2(texel.x * 1.5, 0.0), dy = vec2(0.0, texel.y * 1.5);
        vec3 n0 = texture2D(tNormal, vUv).rgb;
        float nEdge = length(texture2D(tNormal, vUv + dx).rgb - n0) + length(texture2D(tNormal, vUv - dx).rgb - n0) + length(texture2D(tNormal, vUv + dy).rgb - n0) + length(texture2D(tNormal, vUv - dy).rgb - n0);
        float d0 = view(vUv);
        float dEdge = abs(view(vUv + dx) - d0) + abs(view(vUv - dx) - d0) + abs(view(vUv + dy) - d0) + abs(view(vUv - dy) - d0);
        float edge = max(smoothstep(0.5, 0.9, nEdge), smoothstep(0.035, 0.09, dEdge / max(d0, 0.5)));
        gl_FragColor = vec4(mix(base.rgb, ${INK}, edge * 0.92), base.a);
      }`,
  });
  // ShaderPass clones its uniforms and drops render targets' textures: they go on the material afterward.
  pass.material.uniforms.tNormal.value = targets.normal;
  pass.material.uniforms.tDepth.value = targets.depth;
  pass.material.uniforms.tMask.value = targets.mask;
  return pass;
}
