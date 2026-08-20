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
          /* Tunables, driven from tune.ts via the dev panel. */
          uniform float uShellStr;
          uniform float uShellFall;
          uniform float uLitLo;
          uniform float uLitHi;
          uniform float uSideExp;
          uniform float uRingEdge;
          uniform float uRingBase;
          uniform float uRingGain;
          uniform float uBandFall;
          uniform float uBandBase;
          uniform float uBandGain;
          uniform float uSparkPos;
          uniform float uHeartAmp;
          uniform float uHeartTang;
          uniform float uHeartRad;
          uniform float uBleedAmp;
          uniform float uBleedK;
          uniform float uWinLo;
          uniform float uWinHi;
          uniform float uCompress;
          uniform float uWhiteCurve;
          uniform vec3 uHaloDeep;
          uniform vec3 uHaloPale;
          uniform float uPaleMix;
          varying vec2 vPos;
          void main() {
            float d = length(vPos);
            /* Only the quad's far corners die early: the glow is allowed to
               spread, so the working area is deliberately big. By 2.45 the
               window below has already taken everything to zero. */
            if (d > 2.45) discard;
            vec2 nd = normalize(vPos + vec2(1e-5));

            /*
              ONE LIGHT SOURCE behind the planet, up and right of centre,
              never drawn. This material composites with NORMAL alpha
              blending, not additive, and that is the final word on the
              purple halo: additive blue over the backdrop's warm nebula
              can only sum to violet, no matter how the hue is tuned, where
              normal blending paints the air's own blue over it. The layers:

                atmosphere   a faint blue shell around the entire planet,
                             sun-independent, the air itself
                edge glow    the lit arc, a line on the limb plus a real
                             bloom outside it, swelling toward the source
                the spark    a small sharp point right at the edge, blown
                             white, its lower half depth-cut by the sphere
                the bleed    inverse-square halation spreading from the
                             spark as far as the eye can follow it
            */
            float side = dot(nd, uSunDir);
            /*
              Concentration, after review with an annotated screenshot: the
              old gate admitted everything within ~110 degrees of the
              source azimuth, so in the entry framing the top-LEFT limb arc
              glowed almost as brightly as the crest, reading as a glow
              pasted on the wrong side of the planet. The edge glow now
              lives within ~70 degrees of the crest, full only within ~30,
              and what it lost in reach it gains in intensity: brighter,
              bloomier, spreading further out exactly where the source is.
            */
            float lit = smoothstep(uLitLo, uLitHi, side);
            float sidew = pow(max(side, 0.0), uSideExp);

            /* The atmosphere. All the silhouette definition the dark side
               gets, and all it needs. */
            float shell = exp(-max(d - 1.0, 0.0) * uShellFall);
            float a = shell * uShellStr;

            /* The edge glow: line plus bloom, both hugging the crest. The
               bloom's falloff is shallow so it takes real space around the
               source before it lets go. */
            float ring = smoothstep(uRingEdge, 1.0, d);
            a += ring * lit * (uRingBase + uRingGain * sidew);
            float band = exp(-max(d - 1.0, 0.0) * uBandFall);
            a += band * lit * (uBandBase + uBandGain * sidew);

            /* The spark: tiny and blazing. The amplitude is deliberately
               far past saturation and the footprint far smaller than every
               earlier attempt: after the soft compression below, only a
               core a few pixels wide lands at effectively full white, with
               a steep but smooth gaussian shoulder into the bleed's long
               tail. A light source is allowed a solid centre; what it can
               never have is a big one, because a big saturated region's
               rim is the bubble. */
            vec2 rel = vPos - uSunDir * uSparkPos;
            float tang = dot(rel, vec2(-uSunDir.y, uSunDir.x));
            float radial = dot(rel, uSunDir);
            float r2 = dot(rel, rel);
            float heart = uHeartAmp * exp(-(tang * tang * uHeartTang + radial * radial * uHeartRad));
            float bleed = uBleedAmp / (1.0 + r2 * uBleedK);
            a += heart + bleed;

            /* The window, far out where the tail is below perception, so
               the fade never lands on a visible brightness. */
            a *= 1.0 - smoothstep(uWinLo, uWinHi, d);

            /*
              Soft saturation, never a clamp. Under normal blending a hard
              clamp at 1 turns the whole region where the sum exceeds one
              into a flat opaque plateau, and the rim of that plateau is a
              perfect circle around the spark: the bubble. Exponential
              compression approaches full opacity but never flattens, so
              brightness varies smoothly through every pixel of the glow
              and there is no contour anywhere for the eye to find. The
              1.25 gain keeps the faint terms where they were; the bright
              ones land within a few percent of opaque.
            */
            float aC = 1.0 - exp(-uCompress * a);
            /* Most of this quad's 2.5-radius working area carries alpha far
               below one display step; dropping it here skips the blend
               stage across all of it. Below the dither's reach, so no
               visible boundary can form. */
            if (aC < 0.002) discard;

            /* Optically thick and saturated at the limb, thinning to pale
               cyan outward; bright is white, dim is air, colour and
               brightness falling away together through the same smooth
               compression. */
            vec3 deepBlue = uColor * uHaloDeep;
            vec3 paleEdge = mix(uColor, uHaloPale, uPaleMix);
            vec3 atmoCol = mix(deepBlue, paleEdge, smoothstep(1.0, 1.2, d));
            /* The whitening takes its own exponential curve rather than a
               fraction of the opacity: it reaches actual pure white, but
               only where the heart's intensity carries it there, so the
               point blazes while the broad glow stays air-blue. Smooth
               everywhere; a clamp corner here would draw a contour. */
            vec3 col = mix(atmoCol, vec3(1.0), 1.0 - exp(-uWhiteCurve * a));

            /* Dither, scaled by the alpha it is dithering so it can never
               tint empty sky. */
            float dn = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
            aC += (dn - 0.5) * min(0.012, aC);

            gl_FragColor = vec4(col, aC);
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
          /* Tunables, driven from tune.ts via the dev panel. Former
             literals; every default is recorded there. */
          uniform float uTermLo;
          uniform float uTermHi;
          uniform float uSunGain;
          uniform float uSunExp;
          uniform float uAmbHero;
          uniform float uAmbDark;
          uniform vec3 uDuskTint;
          uniform float uNightFloor;
          uniform float uNightFloorDark;
          uniform float uShoreNight;
          uniform float uLimbDark;
          uniform float uShelfExp;
          uniform float uDeepMul;
          uniform float uWaveBase;
          uniform float uWaveAmp;
          uniform float uShoreGlow;
          uniform vec3 uIceCol;
          uniform float uIceLo;
          uniform float uIceHi;
          uniform float uIceAmt;
          uniform float uCityGain;
          uniform float uCityThLo;
          uniform float uCityThHi;
          uniform float uHazeGain;
          uniform float uBorderLit;
          uniform float uBorderDay;
          uniform float uGlintExp;
          uniform float uLaneTight;
          uniform float uGlintFresW;
          uniform float uGlintBase;
          uniform float uGlintGain;
          uniform float uGlintShelf;
          uniform float uRimPow;
          uniform float uRimGain;
          uniform float uHazePow;
          uniform float uHazeAmt;
          uniform float uRimSunLo;
          uniform float uRimSunGain;
          uniform float uRimWhite;
          uniform float uShOffX;
          uniform float uShOffY;
          uniform float uShMip;
          uniform float uShLo;
          uniform float uShHi;
          uniform float uShStr;
          uniform float uShCity;
          uniform float uShGlint;
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
            /* Bicubic exists to fix MAGNIFICATION blur at the entry crop.
               Minified (the ball view, most of the page's life) the texel
               footprint passes a screen pixel, reconstruction adds nothing
               over the mip chain, and one bilinear tap replaces four. */
            vec2 fpx = fwidth(uv) / uLandTexel;
            if (max(fpx.x, fpx.y) > 1.0) return texture2D(uLand, uv).r;
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
            float daylight = smoothstep(uTermLo, uTermHi, sunDot);

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
              vec2(vUv.x + uCloudShift + uShOffX, vUv.y + uShOffY), uShMip).r;
            /* Thresholded to the deck and cores only, on a wide ramp. The
               shell's thin cirrus veil neither shadows the ground nor blots
               the lights, and that difference is itself a depth cue: the
               ground stays readable under high haze and goes dark under
               real weather. */
            float cloudCover = smoothstep(uShLo, uShHi, cloudTap) * uCloudAmt;

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
            vec3 water = mix(uOcean * uDeepMul, uShallow, pow(shelf, uShelfExp))
                       * (uWaveBase + uWaveAmp * wave);
            water += uOcean * shore * uShoreGlow;
            vec3 base = mix(water, uLandCol, smoothstep(0.04, 0.42, land));

            /*
              Ice caps. The land channel's top values are Blue Marble's
              brightest surfaces, which on this planet means snow and ice:
              deserts peak around 0.66 and stay below the gate, snowpack
              sits at 0.85 and up. The one flat land colour is the art
              direction everywhere else, but ice is the exception worth
              keeping: without it Greenland reads as generic terrain in
              daylight. Whitened BEFORE lighting, so ice shades, shadows
              and darkens like any other ground, it is just brighter and
              barely blue, the way ice photographs from orbit.
            */
            base = mix(base, uIceCol, smoothstep(uIceLo, uIceHi, land) * uIceAmt);

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
            vec3 sunTint = mix(vec3(1.0), uDuskTint, duskBand);
            /* The dark floor deepens with uDark: the settled section view sat
               too well lit in shadow at the hero's ambient level. */
            vec3 lit = base * (mix(uAmbHero, uAmbDark, uDark) * vec3(0.85, 0.92, 1.12)
                     + uSunGain * pow(clamp(sunDot, 0.0, 1.0), uSunExp) * sunTint);

            /*
              The night hemisphere was near flat black, which amputates the
              sphere. A trace of atmosphere green in the dark ocean keeps the
              ball readable without competing with the city lights.
            */
            lit += uAtmo * (1.0 - daylight) * mix(uNightFloor, uNightFloorDark, uDark)
                 * (0.4 + 0.6 * shelf) * (1.0 - land);
            lit += uAtmo * shore * uShoreNight * (1.0 - 0.5 * uDark) * (1.0 - daylight);

            /* Limb darkening: photographed planets dim toward the edge even
               in daylight, as the light path through atmosphere lengthens.
               Squared so the middle of the face is untouched. */
            lit *= 1.0 - uLimbDark * fres * fres;

            /* The cast shadow. Day side only: a shadow needs a sun. This is
               the one term that makes the shell read as floating above the
               surface rather than painted onto it. */
            lit *= 1.0 - cloudCover * uShStr * daylight;

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
            glow = smoothstep(uCityThLo, uCityThHi, glow);
            /* Gain near 1.5, not 2.3: above roughly 1.6 the warm colour clips
               to white in every channel and the lights lose their gold. */
            vec3 city = uCity * glow * uCityGain * (1.0 - daylight) * smoothstep(0.02, 0.18, land);

            /*
              Bloom for free. Sampling the lights map with an explicit mip
              bias reads a pre-blurred copy straight out of the existing
              mipmap chain: no post-processing pass, one instruction, and the
              big conurbations haze softly the way a camera sees them.
            */
            /* The low edge sits at 0.08, not 0.02: the mip-blurred tap
               averages broad dim washes (snowfields, residual airglow) into
               values just above a 0.02 floor, and gold haze over dark blue
               land reads brown. Real conurbation blooms sit far above 0.08. */
            float cityHaze = pow(texture2D(uLights, vUv, 4.0).r, 2.2);
            city += uCity * smoothstep(0.08, 0.5, cityHaze) * uHazeGain
                  * (1.0 - daylight) * smoothstep(0.02, 0.18, land);

            /* Weather over the lights. The shell is nearly invisible at
               night, so without this an overcast conurbation would shine
               through its own cloud cover. Near 0.7, not less: the residue
               of gold under a dusk cloud is what muddied the deck toward
               khaki in the first cut. */
            city *= 1.0 - cloudCover * uShCity;

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
            color += uCity * border * (uBorderLit - uBorderDay * daylight);

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
            float spec = pow(max(dot(n, halfway), 0.0), uGlintExp)
                       * exp(-uLaneTight * across * across)
                       * (1.0 - land * 0.8);
            /* The sea state breaks the glint up. A perfectly smooth ocean
               reflects a clean oval, which is the tell that it is a shader. */
            spec *= 0.75 + 0.5 * wave;
            /* Overcast water does not glitter. */
            spec *= 1.0 - cloudCover * uShGlint;
            /* Shallow water catches more of it than open ocean, which gives the
               glint some structure instead of a clean oval. The fresnel weight
               sits a little higher since the sun point landed on the limb: the
               water's light bleed is that point's reflection, and it grades
               away from the crest the way the flare above it does. */
            color += uGlint * spec * (uGlintBase + uGlintFresW * pow(fres, 2.5))
                   * (0.8 + uGlintShelf * shelf) * uGlintGain;

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
            float sunSide = uRimSunLo + uRimSunGain * smoothstep(-0.7, 0.35, sunDot);
            float rim = pow(fres, uRimPow) * uRimGain;
            float haze = pow(fres, uHazePow) * uHazeAmt;
            /* The rim whitens where the sun grazes it, so the inside edge of
               the limb agrees with the hot line the halo draws outside it,
               and it whitens toward the same warm white as the sun point,
               harder than before: the surface has to look lit BY that point,
               not merely near it. */
            vec3 rimCol = mix(uAtmo, vec3(1.0, 0.98, 0.92), uRimWhite * smoothstep(0.05, 0.55, sunDot));
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
          /* Tunables, driven from tune.ts via the dev panel. */
          uniform float uTermLo;
          uniform float uTermHi;
          uniform float uDeckLo;
          uniform float uDeckGrain;
          uniform float uDeckHi;
          uniform float uCoreLo;
          uniform float uCoreHi;
          uniform float uVeilLo;
          uniform float uVeilHi;
          uniform float uVeilEnvLo;
          uniform float uVeilEnvHi;
          uniform float uVeilAlpha;
          uniform float uVeilSupp;
          uniform float uVeilColMix;
          uniform float uToneBase;
          uniform float uToneDeck;
          uniform float uToneCore;
          uniform vec3 uCloudWhite;
          uniform float uCloudGain;
          uniform float uCloudExp;
          uniform float uTopBase;
          uniform float uTopGain;
          uniform float uShadeGain;
          uniform float uShadeBase;
          uniform float uShadeCore;
          uniform float uCShOffX;
          uniform float uCShOffY;
          uniform vec3 uCloudAmb;
          uniform float uCAmbBase;
          uniform float uCAmbNight;
          uniform vec3 uVeilCol;
          uniform float uVeilColBase;
          uniform float uVeilColGain;
          uniform float uCFresLo;
          uniform float uCFresHi;
          uniform float uCNightAlpha;
          uniform float uParDeck;
          uniform float uParVeil;
          uniform float uCLimbDark;
          varying vec2 vUv;
          varying vec3 vWorldNormal;
          varying vec3 vWorldPos;

          void main() {
            vec3 n = normalize(vWorldNormal);
            vec3 viewDir = normalize(cameraPosition - vWorldPos);
            float sunDot = dot(n, uSun);
            float ndv = clamp(dot(n, viewDir), 0.0, 1.0);
            float fres = 1.0 - ndv;
            float daylight = smoothstep(uTermLo, uTermHi, sunDot);

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
            float cl = texture2D(uClouds, cuv + parUv * uParDeck).r;
            /* The system envelope, free from the mipmap chain: a blurred
               copy of the map is a height field, high over the mass of each
               system and falling to nothing at its skirts. */
            float envelope = texture2D(uClouds, cuv, 3.5).r;

            /* Early out over clear sky. A fragment that can produce
               neither deck (cl under every threshold the grain could
               build) nor veil (the envelope gate is closed) skips the
               remaining taps and the whole lighting path; roughly half the
               shell's area is such sky. Exact, not conservative: both
               terms evaluate to zero everywhere this fires. */
            if (cl < uDeckLo && envelope < uVeilEnvLo) discard;

            /* The veil: higher, so it parallaxes further. It drifts in
               EXACT lockstep with the deck, one uCloudShift for both: an
               earlier cut sheared it 35% faster as wind shear and the two
               layers read as independently spinning shells. The fixed
               offset decorrelates its pattern from the deck's, so it reads
               as its own field of wisps rather than a halo traced around
               every cloud below it. */
            float hiTap = texture2D(uClouds,
              cuv + parUv * uParVeil + vec2(0.165, 0.032)).r;

            /*
              Noise-modulated threshold on the deck, so no contour of the
              bitmap survives as a traced outline. The low edge sits high on
              purpose: thin haze admitted here merged the whole northern
              hemisphere into one milky sheet in an earlier cut.
            */
            float grain = texture2D(uNoise, vUv * vec2(21.0, 10.5)).r;
            float deck = smoothstep(uDeckLo + uDeckGrain * grain, uDeckHi, cl);
            float core = smoothstep(uCoreLo, uCoreHi, cl);
            /* Cirrus lives around weather, not in empty sky: the envelope
               gate ties every wisp to a system it can plausibly belong to,
               and the deck term hands the pixel over where the deck is
               solid underneath. */
            float veil = smoothstep(uVeilLo, uVeilHi, hiTap)
                       * smoothstep(uVeilEnvLo, uVeilEnvHi, envelope)
                       * (1.0 - deck * uVeilSupp);

            float a = clamp(deck + veil * uVeilAlpha, 0.0, 1.0) * uCloudAmt;

            /*
              Fresnel fade at the silhouette, and it goes all the way to
              zero: a partial fade left the deck's cutout edge floating over
              the rim as a paper-thin white streak, which is the one place
              the shell confesses it has no thickness. Full strength to 96%
              of the disc radius, gone at the limb; the earlier bald-band
              mistake was starting a deep fade at 79% of the radius, not
              fading fully at the edge.
            */
            a *= 1.0 - smoothstep(uCFresLo, uCFresHi, fres);

            /* At night the deck is a ghost: barely lit, but still dense
               enough to sit visibly over the city lights. */
            a *= uCNightAlpha + (1.0 - uCNightAlpha) * daylight;

            if (a < 0.004) discard;

            /*
              Self-shading: one tap displaced toward the sun. Where the deck
              thickens up-sun of a fragment, that fragment sits in its
              neighbour's shade. Scaled up over the cores: a tall cloud
              throws a deeper flank shadow, which is most of what makes the
              centres read as towers instead of stains.
            */
            float up = texture2D(uClouds, cuv + parUv * uParDeck + vec2(uCShOffX, uCShOffY)).r;
            float shade = clamp((up - cl) * uShadeGain, 0.0, 0.5) * (uShadeBase + uShadeCore * core);

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
            float direct = pow(clamp(sunDot, 0.0, 1.0), uCloudExp);
            float topLight = uTopBase + uTopGain * smoothstep(0.30, 0.85, envelope);
            /*
              The tone ladder, bottom of the cloudscape to top: grey where
              the deck thins into its skirts, whitish grey through the body,
              full white only at the tall cores. Altitude read as value, the
              way a cloudscape actually shades, and it is what blends the
              strata: each band hands to the next through one continuous
              ramp instead of a colour jump at a threshold.
            */
            float tone = uToneBase + uToneDeck * deck + uToneCore * core;
            vec3 col = uCloudWhite * (uCloudGain * direct) * topLight * tone
                     * (1.0 - shade);
            /* The veil enters the ladder from below: grey, dim, barely
               blue, handing over to the deck early so the two meet inside
               the grey band. */
            col = mix(uVeilCol * (uVeilColBase + uVeilColGain * direct), col,
                      clamp(deck * uVeilColMix, 0.0, 1.0));
            col += uCloudAmb * (uCAmbBase + uCAmbNight * (1.0 - daylight));

            /* The same limb darkening the surface wears. */
            col *= 1.0 - uCLimbDark * fres * fres;

            gl_FragColor = vec4(col, a);
            #include <colorspace_fragment>
          }
        `,
}
