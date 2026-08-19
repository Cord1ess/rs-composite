/**
 * The globe's GLSL, in one place. Both materials in earth-scene consume these;
 * scripts/lint-shaders.mjs scans this file too, keyed on the property names.
 */

export const haloShader = {
  vertexShader: `
          varying vec2 vPos;
          void main() {
            vPos = position.xy;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
  fragmentShader: `
          uniform vec3 uColor;
          uniform vec2 uSunDir;
          varying vec2 vPos;
          void main() {
            float d = length(vPos);
            /* Past the bloom and the flare tails nothing survives, but the
               quad's corners still reach d 1.9. Dropping them here skips the
               blend stage for roughly a third of the quad's area. */
            if (d > 1.32) discard;
            vec2 nd = normalize(vPos + vec2(1e-5));

            /*
              Three layers, matching the reference frame.

              A thin crisp line hugging the limb. The sphere occludes this plane
              inside the silhouette, so only the sliver just outside d = 1
              survives, which is exactly the hard bright edge in the source.
            */
            /*
              ONE LIGHT SOURCE, nothing else. A very large light far behind
              the planet, up and to the right of centre, never drawn, only
              implied. Two things reach the camera from it:

                the edge glow   where its light grazes the limb, a glow
                                hugging the top-right edge, brightest at
                                the point nearest the source and fading
                                along the arc into the dark side

                the spark       at the centre of that edge glow, where the
                                source clears the edge, light bleeds: a
                                blown-white heart with an inverse-square
                                halation around it

              The previous versions failed as GREY. The heart's alpha
              exceeded full saturation only across a few pixels, so nearly
              all of the visible glow sat at mid alpha, and mid-alpha white
              over black IS grey: the toned-down-highlights look. The
              heart below holds alpha above one across a real area, then
              hands off to the bleed, so the centre is blown white and the
              falloff never presents an outline.
            */
            float side = dot(nd, uSunDir);
            /* The lit arc. The glow lives on the source's side and dies
               into the dark side; a whisper survives everywhere so the
               silhouette never dissolves into the sky. */
            float lit = 0.05 + 0.95 * smoothstep(-0.35, 0.55, side);
            float sidew = pow(max(side, 0.0), 2.0);

            /* The edge glow: a tight line on the limb and a soft shell of
               air just outside it, both swelling toward the source. */
            float ring = smoothstep(1.035, 1.0, d);
            float band = exp(-max(d - 1.0, 0.0) * 14.0);
            float a = ring * lit * (0.45 + 1.9 * sidew);
            a += band * lit * (0.08 + 0.55 * sidew * max(side, 0.0));

            /* The spark: not a ball of light, a crescent of overexposure
               pressed against the edge. An isotropic heart read as a disc
               hovering over the planet; this one is elongated along the
               limb and shallow radially, centred nearly on the edge with
               its lower half depth-cut by the sphere, so what survives is
               the edge itself burning where the source sits behind it. */
            vec2 rel = vPos - uSunDir * 1.015;
            float tang = dot(rel, vec2(-uSunDir.y, uSunDir.x));
            float radial = dot(rel, uSunDir);
            float r2 = dot(rel, rel);
            float heart = 3.0 * exp(-(tang * tang * 90.0 + radial * radial * 520.0));
            float bleed = 1.6 / (1.0 + r2 * 55.0);
            a += heart + bleed;

            /*
              The window. Every term above must reach zero BEFORE the
              discard radius, or the cut renders as a hard clipped arc
              across the glow.
            */
            a *= 1.0 - smoothstep(1.20, 1.31, d);

            /*
              The scattering gradient. Real limb atmosphere is not one colour:
              the shell is optically thickest right at the limb, deep and
              saturated, and thins outward toward pale cyan white. Three stops
              by distance replace the flat colour, which is most of the
              difference between a glow effect and an atmosphere.
            */
            /*
              Both stops sit toward cyan-azure, red held right down. This is
              the second pass at the purple halo: the first kept the pale
              stop "inside the blue family" but left enough red (0.48 in
              display terms at the deep stop) that the additive blend over
              the backdrop's warm regions still read violet on real
              hardware. Red is what makes additive blue go purple; starve it.
            */
            vec3 deepBlue = uColor * vec3(0.34, 0.78, 1.0);
            vec3 paleEdge = mix(uColor, vec3(0.50, 0.92, 1.0), 0.65);
            vec3 atmoCol = mix(deepBlue, paleEdge, smoothstep(1.0, 1.2, d));

            /* One rule for colour: whatever is bright is white, whatever is
               dim is air. Tying the whitening directly to the summed
               intensity means colour and brightness fall away TOGETHER;
               the old independent mix let the glow pass through a distinct
               blue zone while still bright, which drew a ring around the
               spark and read as a hollow. Neutral white, never warm: the
               cyan-to-warm blend passes through green at half strength. */
            vec3 col = mix(atmoCol, vec3(1.0), clamp(a * 0.5, 0.0, 0.97));

            /*
              Dither. A smooth dark green gradient over this much screen bands
              visibly on 8 bit displays, and additive blending makes it worse.
              Half a step of screen anchored noise breaks the contours up at an
              amplitude well below anything the eye can see as noise.
            */
            float dn = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
            /* Scaled by the alpha it is dithering. A constant amplitude put
               noise over the whole quad, and because the negative half then
               clipped at zero it net-ADDED a faint blue wash out to the
               quad's edge: over the maroon nebula, a faint purple wash. */
            a += (dn - 0.5) * min(0.012, a);

            gl_FragColor = vec4(col, clamp(a, 0.0, 2.0));
          }
        `,
}

export const earthShader = {
  vertexShader: `
          varying vec2 vUv;
          varying vec3 vWorldNormal;
          varying vec3 vWorldPos;
          void main() {
            vUv = uv;
            vWorldNormal = normalize(mat3(modelMatrix) * normal);
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorldPos = wp.xyz;
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `,
  fragmentShader: `
          uniform sampler2D uLights;
          uniform sampler2D uLand;
          uniform sampler2D uBorders;
          uniform vec3 uSun;
          uniform vec3 uOcean;
          uniform vec3 uLandCol;
          uniform vec3 uAtmo;
          uniform vec3 uGlint;
          uniform vec3 uCity;
          uniform float uDark;
          uniform sampler2D uNoise;
          uniform sampler2D uClouds;
          uniform float uCloudAmt;
          uniform float uCloudShift;
          uniform vec3 uShallow;
          uniform vec2 uLandTexel;
          varying vec2 vUv;
          varying vec3 vWorldNormal;
          varying vec3 vWorldPos;

          /*
            Bicubic sampling for the land channel only. Bilinear magnification
            is what made the coastline mushy at the entry crop: a B spline
            cubic reconstructs a smooth curve through the same texels, four
            bilinear fetches doing the work of sixteen taps. No data changed,
            no alignment risk, just better reconstruction.
          */
          vec4 cubicWeights(float t) {
            vec4 e = vec4(1.0, 2.0, 3.0, 4.0) - t;
            vec4 e3 = e * e * e;
            float wa = e3.x;
            float wb = e3.y - 4.0 * e3.x;
            float wc = e3.z - 4.0 * e3.y + 6.0 * e3.x;
            return vec4(wa, wb, wc, 6.0 - wa - wb - wc) * (1.0 / 6.0);
          }

          float landBicubic(vec2 uv) {
            vec2 tsz = 1.0 / uLandTexel;
            vec2 crd = uv * tsz - 0.5;
            vec2 fxy = fract(crd);
            crd -= fxy;
            vec4 wx = cubicWeights(fxy.x);
            vec4 wy = cubicWeights(fxy.y);
            vec4 corner = crd.xxyy + vec2(-0.5, 1.5).xyxy;
            vec4 sums = vec4(wx.xz + wx.yw, wy.xz + wy.yw);
            vec4 off = (corner + vec4(wx.yw, wy.yw) / sums) * uLandTexel.xxyy;
            float t00 = texture2D(uLand, off.xz).r;
            float t10 = texture2D(uLand, off.yz).r;
            float t01 = texture2D(uLand, off.xw).r;
            float t11 = texture2D(uLand, off.yw).r;
            float fx = sums.x / (sums.x + sums.y);
            float fy = sums.z / (sums.z + sums.w);
            return mix(mix(t11, t01, fx), mix(t10, t00, fx), fy);
          }

          void main() {
            vec3 n = normalize(vWorldNormal);
            vec3 viewDir = normalize(cameraPosition - vWorldPos);
            float sunDot = dot(n, uSun);
            float fres = 1.0 - clamp(dot(n, viewDir), 0.0, 1.0);

            /* Wide, soft terminator. A hard one reads as a lighting bug. */
            float daylight = smoothstep(-0.18, 0.42, sunDot);

            /*
              One channel, two signals. Ocean depth occupies the bottom half of
              the range and land brightness the top, split back apart here. The
              split is continuous across the coastline, so there is no seam.
            */
            float surf = landBicubic(vUv);
            float land = clamp((surf - 0.5) * 2.0, 0.0, 1.0);
            float shelf = clamp(surf * 2.0, 0.0, 1.0);
            float lights = texture2D(uLights, vUv).r;

            /*
              The cloud deck lives on its own shell now (cloudShader below).
              The surface keeps exactly one tap of the same map, read slightly
              toward the sun, and gets two things from it: the cast shadow
              that anchors the deck to the ground on the day side, and weather
              cover over the city lights at night. The offset is what sells
              altitude: each shadow sits displaced from the cloud that throws
              it, down-sun, and the displacement matches the shell's height.
            */
            /* The mip bias is the shadow's softness: it reads a pre-blurred
               copy straight out of the existing mipmap chain, so the shadow
               lands with a wide penumbra instead of tracing the cloud's
               crisp outline onto the ground. A real shadow thrown from
               altitude has exactly that soft edge, and it costs nothing. */
            float cloudTap = texture2D(uClouds,
              vec2(vUv.x + uCloudShift + 0.0030, vUv.y + 0.0044), 2.5).r;
            /* Thresholded to the deck and cores only, on a wide ramp. The
               shell's thin cirrus veil neither shadows the ground nor blots
               the lights, and that difference is itself a depth cue: the
               ground stays readable under high haze and goes dark under
               real weather. */
            float cloudCover = smoothstep(0.30, 0.90, cloudTap) * uCloudAmt;

            /*
              The planet's colour is generated, not sampled. There is no albedo
              map: the texture only says land or water and how deep, and the
              shading does the rest. That is the whole reason this version is a
              fifth of the size of the photographic one.

              The water is not a flat fill. Real bathymetry rides on it, so
              continental shelves sit lighter than abyssal plain and the mid
              ocean ridges show.
            */
            /*
              Sea state. Two octaves from the precomputed tiling noise texture,
              scaled 2:1 to stay isotropic on the equirectangular map. Anchored
              to the surface through vUv, so the pattern turns with the globe
              and reads as water rather than as screen grain. Kept low
              amplitude: the water should vary, not pattern.
            */
            float wave = 0.65 * texture2D(uNoise, vUv * vec2(9.375, 4.6875)).r
                       + 0.35 * texture2D(uNoise, vUv * vec2(28.125, 14.0625)).r;

            /*
              A faint bright water line hugging the coasts, straight from the
              depth channel: surf approaches 0.5 at the shoreline from below.
              Sharpens every continent silhouette for free.
            */
            float shore = smoothstep(0.30, 0.485, surf) * (1.0 - land);

            /*
              The depth story. shelf is the contrast curved GEBCO depth, near
              one on the continental shelf and low over the abyss, so the water
              ramps from bright shallow turquoise hugging every coast down into
              deep open blue. The curve lives in the texture bake; the ramp
              exponent here shapes how quickly the shallows fall away.
            */
            vec3 water = mix(uOcean * 0.5, uShallow, pow(shelf, 1.3)) * (0.92 + 0.16 * wave);
            water += uOcean * shore * 0.55;
            vec3 base = mix(water, uLandCol, smoothstep(0.04, 0.42, land));

            /*
              High gain, because the sun only grazes: peak sunDot across the
              visible cap is about 0.49, so a gain near 1 leaves the whole
              planet dark. This brings the lit top right up to roughly half
              brightness and lets the bottom fall to near black.
            */
            /*
              Colour temperature, kept an order of magnitude below the
              rejected dust ring. The shadow's ambient light is skylight, so
              it cools; the last lit degrees before the terminator warm by a
              few percent, the way low sun does. Both are tints on existing
              terms, not added bands, so neither can read as a ring.
            */
            float duskBand = smoothstep(0.30, 0.02, sunDot) * smoothstep(-0.12, 0.02, sunDot);
            vec3 sunTint = mix(vec3(1.0), vec3(1.07, 0.98, 0.90), duskBand);
            /* The dark floor deepens with uDark: the settled section view sat
               too well lit in shadow at the hero's ambient level. */
            vec3 lit = base * (mix(0.035, 0.016, uDark) * vec3(0.85, 0.92, 1.12)
                     + 7.0 * pow(clamp(sunDot, 0.0, 1.0), 1.25) * sunTint);

            /*
              The night hemisphere was near flat black, which amputates the
              sphere. A trace of atmosphere green in the dark ocean keeps the
              ball readable without competing with the city lights.
            */
            lit += uAtmo * (1.0 - daylight) * mix(0.018, 0.008, uDark) * (0.4 + 0.6 * shelf) * (1.0 - land);
            lit += uAtmo * shore * 0.05 * (1.0 - 0.5 * uDark) * (1.0 - daylight);

            /* Limb darkening: photographed planets dim toward the edge even
               in daylight, as the light path through atmosphere lengthens.
               Squared so the middle of the face is untouched. */
            lit *= 1.0 - 0.22 * fres * fres;

            /* The cast shadow. Day side only: a shadow needs a sun. This is
               the one term that makes the shell read as floating above the
               surface rather than painted onto it. */
            lit *= 1.0 - cloudCover * 0.34 * daylight;

            /*
              City lights are emissive: added, never lit, because they do not
              get darker for being in shadow. On land only.

              Only the luminance is taken, then recoloured. Black Marble carries
              a dim blue grey wash across unlit land as well as the lights
              themselves, and using its colour directly turned every dark
              continent purple. The threshold drops that wash to nothing and
              leaves the conurbations.

              The map is single channel and sRGB encoded; the pow linearises
              it, which the sRGB texture flag used to do before the maps moved
              to R8.
            */
            float glow = pow(lights, 2.2);
            glow = smoothstep(0.05, 0.45, glow);
            /* Gain 1.5, not 2.3: above roughly 1.6 the warm colour clips to
               white in every channel and the lights lose their gold. */
            vec3 city = uCity * glow * 1.5 * (1.0 - daylight) * smoothstep(0.02, 0.18, land);

            /*
              Bloom for free. Sampling the lights map with an explicit mip
              bias reads a pre-blurred copy straight out of the existing
              mipmap chain: no post-processing pass, one instruction, and the
              big conurbations haze softly the way a camera sees them.
            */
            float cityHaze = pow(texture2D(uLights, vUv, 4.0).r, 2.2);
            city += uCity * smoothstep(0.02, 0.5, cityHaze) * 0.35
                  * (1.0 - daylight) * smoothstep(0.02, 0.18, land);

            /* Weather over the lights. The shell is nearly invisible at
               night, so without this an overcast conurbation would shine
               through its own cloud cover. 0.7, not less: the residue of
               gold under a dusk cloud is what muddied the deck toward
               khaki in the first cut. */
            city *= 1.0 - cloudCover * 0.7;

            vec3 color = lit + city;

            /*
              Country outlines, in the same colour as the city lights so they
              read as part of the same layer rather than as an overlay.

              The mask carries its own weighting: coastlines and internal
              borders are dim, Bangladesh is brighter and thicker, so one
              texture read gives both. Kept faint on the lit side, where the
              surface is bright enough to swallow them anyway, and allowed to
              come up on the night side where they do the work.
            */
            float border = texture2D(uBorders, vUv).r;
            color += uCity * border * (0.30 - 0.15 * daylight);

            /*
              Sun glint off water. The bright bloom where the sun clears the
              limb in the reference.

              Note the variable name. This was called "half", which is a
              RESERVED KEYWORD in GLSL ES. The shader failed to compile, the
              Earth mesh silently did not draw at all, and what was left on
              screen was the atmosphere plane on its own: a flat disc with a
              conical gradient, because that plane's alpha varies with the angle
              around its centre. It reads exactly like a lighting bug and is not
              one.
            */
            vec3 halfway = normalize(uSun + viewDir);
            /* fres is declared at the top of main; the limb darkening needed
               it before the lighting terms. */

            /*
              Broad, and pushed to the limb.

              At exponent 110 this was a pinpoint sitting wherever the half
              vector happened to line up. In the source it is a wide bloom that
              sits on the edge of the disc and washes along it. So the lobe is
              far wider, and it is weighted by the same fresnel term the
              atmosphere uses, which concentrates it where the surface turns
              away.
            */
            /*
              Tighter than it was. At exponent 22 with a broad base term the
              glint washed across the whole upper cap as a big soft sheen. The
              reference concentrates the light bleed near the limb below the
              sunrise spot, so the lobe is narrower and nearly all of its
              weight now comes through the fresnel term.
            */
            /*
              The glitter lane. Satellite sun glitter is not a round highlight:
              it stretches along the sun's azimuth. Penalising deviation
              perpendicular to the sun-view plane elongates the lobe into the
              lane, and the sea state noise then reads as waves inside it.
            */
            float across = dot(n, normalize(cross(uSun, viewDir) + vec3(1e-5)));
            float spec = pow(max(dot(n, halfway), 0.0), 26.0)
                       * exp(-45.0 * across * across)
                       * (1.0 - land * 0.8);
            /* The sea state breaks the glint up. A perfectly smooth ocean
               reflects a clean oval, which is the tell that it is a shader. */
            spec *= 0.75 + 0.5 * wave;
            /* Overcast water does not glitter. */
            spec *= 1.0 - cloudCover * 0.7;
            /* Shallow water catches more of it than open ocean, which gives the
               glint some structure instead of a clean oval. The fresnel weight
               sits a little higher since the sun point landed on the limb: the
               water's light bleed is that point's reflection, and it grades
               away from the crest the way the flare above it does. */
            color += uGlint * spec * (0.10 + 2.8 * pow(fres, 2.5)) * (0.8 + 0.5 * shelf) * 1.4;

            /*
              No twilight band. One was tried here, a warm strip along the
              terminator, and at this grazing sun angle the terminator crosses
              the whole visible cap, so it rendered as a broad dust coloured
              ring around the planet. Rejected on sight.
            */

            /*
              Atmospheric scattering on the surface, hugging the limb.

              The exponent here is the whole difference between a planet and a
              blue blob. A cropped globe shows almost nothing but the region
              near the limb, so the fresnel term is large across the entire
              visible cap, not just at its edge. Measured at the top of the cap:

                pow(fres, 3.2) = 0.18     floods the planet
                pow(fres, 9.0) = 0.006    confined to the edge

              So it is split. A tight, bright rim that only exists within a few
              percent of the silhouette, plus a broad haze at low enough
              amplitude to tint the surface rather than drown it.
            */
            /* fres is declared above, with the glint. */
            float sunSide = 0.18 + 1.5 * smoothstep(-0.7, 0.35, sunDot);
            float rim = pow(fres, 9.0) * 1.6;
            float haze = pow(fres, 2.5) * 0.06;
            /* The rim whitens where the sun grazes it, so the inside edge of
               the limb agrees with the hot line the halo draws outside it,
               and it whitens toward the same warm white as the sun point,
               harder than before: the surface has to look lit BY that point,
               not merely near it. */
            vec3 rimCol = mix(uAtmo, vec3(1.0, 0.98, 0.92), 0.5 * smoothstep(0.05, 0.55, sunDot));
            color += rimCol * (rim + haze) * sunSide;

            gl_FragColor = vec4(color, 1.0);
            #include <colorspace_fragment>
          }
        `,
}

/*
  The cloud deck. A separate translucent sphere riding 0.6% above the surface,
  drawn after the opaque earth, which buys three things the surface-painted
  clouds could never have: real parallax against the ground at the limb, a
  silhouette that can be lit independently of the terrain under it, and depth,
  because the deck's cast shadow (one tap in the earth shader above) lands
  displaced from the cloud that throws it.

  Two earlier cloud passes were painted into the earth fragment and both were
  rejected: a single tap read as a wrapped png, and a two-deck emboss read as
  stains. The failure was structural, not a tuning miss: paint mixed into the
  ground plane can never separate from it.
*/
export const cloudShader = {
  vertexShader: `
          varying vec2 vUv;
          varying vec3 vWorldNormal;
          varying vec3 vWorldPos;
          void main() {
            vUv = uv;
            vWorldNormal = normalize(mat3(modelMatrix) * normal);
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorldPos = wp.xyz;
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `,
  fragmentShader: `
          uniform sampler2D uClouds;
          uniform sampler2D uNoise;
          uniform vec3 uSun;
          uniform float uCloudShift;
          uniform float uCloudAmt;
          varying vec2 vUv;
          varying vec3 vWorldNormal;
          varying vec3 vWorldPos;

          void main() {
            vec3 n = normalize(vWorldNormal);
            vec3 viewDir = normalize(cameraPosition - vWorldPos);
            float sunDot = dot(n, uSun);
            float ndv = clamp(dot(n, viewDir), 0.0, 1.0);
            float fres = 1.0 - ndv;
            float daylight = smoothstep(-0.18, 0.42, sunDot);

            /*
              THE DEPTH STORY, the same trick the ocean pulls with the GEBCO
              channel: one map read as strata. The value is a thickness
              proxy, split into three layers that exist at different
              altitudes, and the flat sheet becomes an atmosphere with an
              inside:

                veil   thin high cirrus, blue-white, translucent, riding
                       above the deck and sheared ahead of it by the drift
                deck   the weather itself, white, self-shaded
                core   the dense centres, taller, brighter tops, deeper
                       flank shadows

              What makes the strata read as REAL altitude rather than three
              tints is parallax: each layer is sampled with a screen-space
              offset proportional to its height, so the veil slides against
              the deck as the globe turns and the high layer leans toward
              the limb exactly the way an elevated feature projects.
            */

            /* Tangential view direction, taken to UV space. The u axis
               shrinks with latitude on an equirectangular map, hence the
               cosLat term; both clamps stop the offset exploding at the
               poles and the limb. */
            vec3 east = normalize(cross(vec3(0.0, 1.0, 0.0), n) + vec3(1e-4));
            vec3 north = cross(n, east);
            vec3 vt = viewDir - n * dot(viewDir, n);
            float cosLat = max(length(n.xz), 0.25);
            vec2 parUv = vec2(dot(vt, east) / (6.2832 * cosLat), dot(vt, north) / 3.1416)
                       / max(ndv, 0.30);
            parUv = clamp(parUv, vec2(-0.012), vec2(0.012));

            vec2 cuv = vec2(vUv.x + uCloudShift, vUv.y);
            /* The deck, just above the shell base. */
            float cl = texture2D(uClouds, cuv + parUv * 0.0025).r;
            /* The veil: three times higher, so it parallaxes further. It
               drifts in EXACT lockstep with the deck, one uCloudShift for
               both: an earlier cut sheared it 35% faster as wind shear and
               the two layers read as independently spinning shells. The
               fixed offset decorrelates its pattern from the deck's, so it
               reads as its own field of wisps rather than a halo traced
               around every cloud below it. */
            float hiTap = texture2D(uClouds,
              cuv + parUv * 0.008 + vec2(0.165, 0.032)).r;
            /* The system envelope, free from the mipmap chain: a blurred
               copy of the map is a height field, high over the mass of each
               system and falling to nothing at its skirts. */
            float envelope = texture2D(uClouds, cuv, 3.5).r;

            /*
              Noise-modulated threshold on the deck, so no contour of the
              bitmap survives as a traced outline. The low edge sits high on
              purpose: thin haze admitted here merged the whole northern
              hemisphere into one milky sheet in an earlier cut.
            */
            float grain = texture2D(uNoise, vUv * vec2(21.0, 10.5)).r;
            float deck = smoothstep(0.26 + 0.20 * grain, 0.82, cl);
            float core = smoothstep(0.58, 0.96, cl);
            /* Cirrus lives around weather, not in empty sky: the envelope
               gate ties every wisp to a system it can plausibly belong to,
               and the deck term hands the pixel over where the deck is
               solid underneath. */
            float veil = smoothstep(0.14, 0.58, hiTap)
                       * smoothstep(0.06, 0.30, envelope)
                       * (1.0 - deck * 0.85);

            float a = clamp(deck + veil * 0.38, 0.0, 1.0) * uCloudAmt;

            /*
              Fresnel fade at the silhouette, and it goes all the way to
              zero: a partial fade left the deck's cutout edge floating over
              the rim as a paper-thin white streak, which is the one place
              the shell confesses it has no thickness. Full strength to 96%
              of the disc radius, gone at the limb; the earlier bald-band
              mistake was starting a deep fade at 79% of the radius, not
              fading fully at the edge.
            */
            a *= 1.0 - smoothstep(0.72, 0.96, fres);

            /* At night the deck is a ghost: barely lit, but still dense
               enough to sit visibly over the city lights. */
            a *= 0.22 + 0.78 * daylight;

            if (a < 0.004) discard;

            /*
              Self-shading: one tap displaced toward the sun. Where the deck
              thickens up-sun of a fragment, that fragment sits in its
              neighbour's shade. Scaled up over the cores: a tall cloud
              throws a deeper flank shadow, which is most of what makes the
              centres read as towers instead of stains.
            */
            float up = texture2D(uClouds, cuv + parUv * 0.0025 + vec2(0.0026, 0.0038)).r;
            float shade = clamp((up - cl) * 1.6, 0.0, 0.5) * (0.55 + 0.9 * core);

            /*
              The lighting ramp across the strata. Sunlit white over a blue
              skylight fill (a neutral grey cloud over this saturated an
              ocean reads tan by contrast); the envelope lifts the tops of
              each system into more sun than its skirts, and the veil sits
              bluer and dimmer than the deck, thin air against thick water
              vapour.
            */
            /*
              Gain 1.45 on a softened exponent, hotter than the first cut's
              1.15/1.05: at this grazing sun angle most of the cap sits at
              low sunDot, and the gentler curve is what lifts the deck from
              grey to white there. The peak by the glint just reaches full
              white, which is where clouds should clip if anywhere.
            */
            float direct = pow(clamp(sunDot, 0.0, 1.0), 0.9);
            float topLight = 0.90 + 0.40 * smoothstep(0.30, 0.85, envelope);
            /*
              The tone ladder, bottom of the cloudscape to top: grey where
              the deck thins into its skirts, whitish grey through the body,
              full white only at the tall cores. Altitude read as value, the
              way a cloudscape actually shades, and it is what blends the
              strata: each band hands to the next through one continuous
              ramp instead of a colour jump at a threshold.
            */
            float tone = 0.72 + 0.18 * deck + 0.12 * core;
            vec3 col = vec3(0.94, 0.97, 1.02) * (1.45 * direct) * topLight * tone
                     * (1.0 - shade);
            /* The veil enters the ladder from below: grey, dim, barely
               blue, handing over to the deck early so the two meet inside
               the grey band. */
            col = mix(vec3(0.64, 0.71, 0.82) * (0.25 + 0.95 * direct), col,
                      clamp(deck * 1.1, 0.0, 1.0));
            col += vec3(0.10, 0.16, 0.30) * (0.38 + 0.45 * (1.0 - daylight));

            /* The same limb darkening the surface wears. */
            col *= 1.0 - 0.22 * fres * fres;

            gl_FragColor = vec4(col, a);
            #include <colorspace_fragment>
          }
        `,
}
