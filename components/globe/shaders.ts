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
            float ring = smoothstep(1.03, 1.0, d);
            /* A soft bloom past it, tight rather than a wide fog. Quieter in
               its far tail than it was: the last few percent of alpha is where
               the additive blend tinted the backdrop. */
            float bloom = smoothstep(1.19, 0.995, d);
            float a = ring * 1.6 + pow(bloom, 3.4) * 0.26;

            /*
              Brightest on the side the sun is on, fading round the limb, rather
              than an even ring. A backlit planet does not glow equally all the
              way round, and an even ring is the giveaway that it is a shader.
            */
            float side = dot(nd, uSunDir) * 0.5 + 0.5;
            a *= mix(0.2, 1.0, pow(side, 1.6));

            /*
              The sunrise. A compact flare pinned to the limb where the sun
              clears it: about ten degrees of arc along the edge, bleeding
              outward with an exponential tail. Added after the side weighting
              so it stays at full strength.
            */
            float along = pow(max(dot(nd, uSunDir), 0.0), 40.0);
            float spot = along * exp(-abs(d - 1.0) * 10.0);
            a += spot * 2.2;

            /*
              The scattering gradient. Real limb atmosphere is not one colour:
              the shell is optically thickest right at the limb, deep and
              saturated, and thins outward toward pale cyan white. Three stops
              by distance replace the flat colour, which is most of the
              difference between a glow effect and an atmosphere.
            */
            /*
              The pale stop stays inside the blue family: mixing toward pure
              white lifted the red channel, and additive red-lifted light over
              the backdrop's dark maroon nebula regions read as a purple halo.
              Pale cyan blue keeps the thin-air read without ever leaving blue.
            */
            vec3 deepBlue = uColor * vec3(0.52, 0.72, 1.0);
            vec3 paleEdge = mix(uColor, vec3(0.62, 0.85, 1.0), 0.6);
            vec3 atmoCol = mix(deepBlue, paleEdge, smoothstep(1.0, 1.2, d));

            /* The line whitens toward the sun and the flare is nearly white,
               like the source. */
            vec3 col = mix(atmoCol, vec3(1.0),
              clamp(spot * 1.4 + ring * 0.3 * pow(side, 3.0), 0.0, 0.8));

            /*
              Dither. A smooth dark green gradient over this much screen bands
              visibly on 8 bit displays, and additive blending makes it worse.
              Half a step of screen anchored noise breaks the contours up at an
              amplitude well below anything the eye can see as noise.
            */
            float dn = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
            a += (dn - 0.5) * 0.012;

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
            /* Shallow water catches more of it than open ocean, which gives the
               glint some structure instead of a clean oval. */
            color += uGlint * spec * (0.10 + 2.4 * pow(fres, 2.5)) * (0.8 + 0.5 * shelf) * 1.4;

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
               the limb agrees with the hot line the halo draws outside it. */
            vec3 rimCol = mix(uAtmo, vec3(1.0), 0.35 * smoothstep(0.1, 0.6, sunDot));
            color += rimCol * (rim + haze) * sunSide;

            /*
              Clouds, one tap at low opacity. Lit by the sun on the day side,
              a ghost at night, covering city lights beneath them the way
              weather actually does. Drift comes through uCloudShift, driven
              only while the hero loop is rendering anyway.
            */
            /*
              Two decks of the same map at different scales and drift rates,
              so the cover has parallax and structure instead of reading as
              one wrapped sheet. The density curve crushes thin haze and
              solidifies the cores, and the relief term embosses each cloud
              against its own shadowed side, which is what makes them read as
              volumes rather than stains on the surface.
            */
            float clA = texture2D(uClouds, vec2(vUv.x + uCloudShift, vUv.y)).r;
            float clB = texture2D(uClouds, vec2(vUv.x * 1.31 + 0.41 + uCloudShift * 1.7, vUv.y)).r;
            float cover = max(clA, clB * 0.8);
            cover = smoothstep(0.14, 0.72, cover);
            float clShadow = texture2D(uClouds, vec2(vUv.x + uCloudShift + 0.0016, vUv.y - 0.0016)).r;
            float relief = clamp((clA - clShadow) * 2.6, -0.4, 0.4);
            vec3 cloudCol = vec3(0.80, 0.87, 0.98)
              * (0.10 + 1.15 * pow(clamp(sunDot, 0.0, 1.0), 1.1))
              * (1.0 + relief);
            color = mix(color, cloudCol, cover * uCloudAmt * (0.10 + 0.5 * daylight));

            gl_FragColor = vec4(color, 1.0);
            #include <colorspace_fragment>
          }
        `,
}
