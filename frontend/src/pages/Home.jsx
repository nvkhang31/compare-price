import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  BarChart3, Bell, ScrollText, RefreshCw,
  ArrowRight, Database, Cpu, Monitor
} from 'lucide-react'

const FONTS = 'https://fonts.googleapis.com/css2?family=Exo+2:ital,wght@0,700;0,800;0,900;1,800&family=Be+Vietnam+Pro:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap'

const DEMO = [
  { sym: 'VNM', kis: '84.500', vnd: '84.500', ok: true  },
  { sym: 'HPG', kis: '31.200', vnd: '31.350', ok: false, d: '+150' },
  { sym: 'VCB', kis: '92.100', vnd: '92.100', ok: true  },
  { sym: 'BID', kis: '47.300', vnd: '47.300', ok: true  },
]

const FEAT_DEFS = [
  { Icon: BarChart3,  clr: 'var(--blue)',   key: 'feat1' },
  { Icon: Bell,       clr: 'var(--amber)',  key: 'feat2' },
  { Icon: ScrollText, clr: 'var(--green)',  key: 'feat3' },
  { Icon: RefreshCw,  clr: 'var(--violet)', key: 'feat4' },
]

const STAT_DEFS = [
  { n: '30',  lbl: 'statsSymbolsLbl', sub: 'statsSymbolsSub' },
  { n: '3+',  lbl: 'statsSourcesLbl', sub: 'statsSourcesSub' },
  { n: '2×',  lbl: 'statsSyncLbl',    sub: 'statsSyncSub'    },
  { n: '<1s', lbl: 'statsRespLbl',    sub: 'statsRespSub'    },
]

const ARCH_DEFS = [
  {
    Icon: Database, lbl: 'archSourcesLbl', colColor: '#3b82f6',
    items: [
      { name: 'KIS WTS API',       tech: 'kis',       techColor: '#e05d44' },
      { name: 'VNDirect finfo',    tech: 'vnd',       techColor: '#1a72e8' },
      { name: 'TCBS apipubaws',    tech: 'tcbs',      techColor: '#f59e0b' },
    ],
  },
  {
    Icon: Cpu, lbl: 'archBackendLbl', colColor: '#a78bfa',
    items: [
      { name: 'Node.js + Express', tech: 'nodejs',    techColor: '#6cc24a' },
      { name: 'MongoDB Atlas',     tech: 'mongodb',   techColor: '#4db33d' },
      { name: 'Daily Scheduler',   tech: 'scheduler', techColor: '#c084fc' },
    ],
  },
  {
    Icon: Monitor, lbl: 'archFrontendLbl', colColor: '#22d3ee',
    items: [
      { name: 'React + Vite',      tech: 'react',     techColor: '#61dafb' },
      { name: 'Tailwind CSS v4',   tech: 'tailwind',  techColor: '#38bdf8' },
      { name: 'Socket.io Client',  tech: 'socketio',  techColor: '#c084fc' },
    ],
  },
]

// ─── WebGL shader background ──────────────────────────────────
const SHADER_VERT = `#version 300 es
precision highp float;
in vec4 position;
void main(){gl_Position=position;}`

const SHADER_FRAG = `#version 300 es
/*
 * Shader by Matthias Hurrle (@atzedent)
 * Adapted for KIS Price Tool hero background
 */
precision highp float;
out vec4 O;
uniform vec2 resolution;
uniform float time;
#define FC gl_FragCoord.xy
#define T time
#define R resolution
#define MN min(R.x,R.y)
float rnd(vec2 p){p=fract(p*vec2(12.9898,78.233));p+=dot(p,p+34.56);return fract(p.x*p.y);}
float noise(in vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);float a=rnd(i),b=rnd(i+vec2(1,0)),c=rnd(i+vec2(0,1)),d=rnd(i+1.);return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);}
float fbm(vec2 p){float t=.0,a=1.;mat2 m=mat2(1.,-.5,.2,1.2);for(int i=0;i<5;i++){t+=a*noise(p);p*=2.*m;a*=.5;}return t;}
float clouds(vec2 p){float d=1.,t=.0;for(float i=.0;i<3.;i++){float a=d*fbm(i*10.+p.x*.2+.2*(1.+i)*p.y+d+i*i+p);t=mix(t,d,a);d=a;p*=2./(i+1.);}return t;}
void main(void){
  vec2 uv=(FC-.5*R)/MN,st=uv*vec2(2,1);
  vec3 col=vec3(0);
  float bg=clouds(vec2(st.x+T*.5,-st.y));
  uv*=1.-.3*(sin(T*.2)*.5+.5);
  for(float i=1.;i<12.;i++){
    uv+=.1*cos(i*vec2(.1+.01*i,.8)+i*i+T*.5+.1*uv.x);
    vec2 p=uv;
    float d=length(p);
    col+=.00125/d*(cos(sin(i)*vec3(1,2,3))+1.);
    float b=noise(i+p+bg*1.731);
    col+=.002*b/length(max(p,vec2(b*p.x*.02,p.y)));
    col=mix(col,vec3(bg*.25,bg*.137,bg*.05),d);
  }
  O=vec4(col,1);
}`

function useShaderBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext('webgl2')
    if (!gl) return

    const mkShader = (type, src) => {
      const s = gl.createShader(type)
      gl.shaderSource(s, src)
      gl.compileShader(s)
      return s
    }
    const vs = mkShader(gl.VERTEX_SHADER, SHADER_VERT)
    const fs = mkShader(gl.FRAGMENT_SHADER, SHADER_FRAG)
    const prog = gl.createProgram()
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,1,-1,-1,1,1,1,-1]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(prog, 'position')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const uRes  = gl.getUniformLocation(prog, 'resolution')
    const uTime = gl.getUniformLocation(prog, 'time')
    const uMove = gl.getUniformLocation(prog, 'move')
    const uTouch = gl.getUniformLocation(prog, 'touch')

    let dpr = Math.max(1, 0.5 * window.devicePixelRatio)
    const resize = () => {
      dpr = Math.max(1, 0.5 * window.devicePixelRatio)
      canvas.width  = canvas.offsetWidth  * dpr
      canvas.height = canvas.offsetHeight * dpr
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    resize()
    window.addEventListener('resize', resize)

    // Pointer tracking for interaction
    let mouse = [0, 0]
    let move  = [0, 0]
    let active = false
    const ptrs = new Map()
    const coords = (x, y) => [x * dpr, canvas.height - y * dpr]
    canvas.addEventListener('pointerdown', e => { active = true;  ptrs.set(e.pointerId, coords(e.clientX, e.clientY)) })
    canvas.addEventListener('pointerup',   e => { ptrs.delete(e.pointerId); active = ptrs.size > 0 })
    canvas.addEventListener('pointerleave',e => { ptrs.delete(e.pointerId); active = ptrs.size > 0 })
    canvas.addEventListener('pointermove', e => {
      if (!active) return
      mouse = coords(e.clientX, e.clientY)
      ptrs.set(e.pointerId, coords(e.clientX, e.clientY))
      move = [move[0] + e.movementX, move[1] + e.movementY]
    })

    let raf
    const loop = now => {
      gl.clearColor(0, 0, 0, 1)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.useProgram(prog)
      const first = ptrs.size > 0 ? ptrs.values().next().value : mouse
      gl.uniform2f(uRes,   canvas.width, canvas.height)
      gl.uniform1f(uTime,  now * 1e-3)
      gl.uniform2f(uMove,  ...move)
      gl.uniform2f(uTouch, ...first)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      raf = requestAnimationFrame(loop)
    }
    loop(0)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(raf)
      gl.deleteProgram(prog)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      gl.deleteBuffer(buf)
    }
  }, [])

  return canvasRef
}

// ─── Page ─────────────────────────────────────────────────────
export default function Home() {
  useEffect(() => {
    if (!document.getElementById('lp-fonts')) {
      const l = Object.assign(document.createElement('link'), {
        id: 'lp-fonts', rel: 'stylesheet', href: FONTS,
      })
      document.head.appendChild(l)
    }
  }, [])

  return (
    <div className="lp">
      <style>{CSS}</style>
      <Hero />
      <Features />
      <Stats />
      <Arch />
      <Cta />
    </div>
  )
}

// ─── Hero (hero-38 split layout) ─────────────────────────────
function Hero() {
  const { t } = useTranslation()
  const canvasRef = useShaderBackground()
  return (
    <section className="lp-hero">
      <canvas ref={canvasRef} className="lp-shader-canvas" aria-hidden="true" />
      <div className="lp-hero-inner">

        {/* Left — text */}
        <div className="lp-left">
          <div className="lp-eyebrow">
            <span className="lp-pulse" />
            {t('home.eyebrow')}
          </div>

          <h1 className="lp-h1">
            {t('home.h1a')}<br />
            {t('home.h1b')}<br />
            <em>{t('home.h1Accent')}</em>{' '}{t('home.h1c')}
          </h1>

          <p className="lp-lead">{t('home.tagline')}</p>

          <div className="lp-actions">
            <Link to="/dashboard" className="lp-btn-cta">
              {t('home.ctaBtn')} <ArrowRight size={14} strokeWidth={2.2} />
            </Link>
            <a href="#features" className="lp-btn-outline">{t('home.featuresBtn')}</a>
          </div>

          <div className="lp-chips">
            {['KIS WTS', 'VNDirect', 'TCBS'].map(s => (
              <span key={s} className="lp-chip">{s}</span>
            ))}
          </div>
        </div>

        {/* Right — framed visual (hero-38 pattern) */}
        <div className="lp-right">
          <div className="lp-dotgrid" aria-hidden="true" />

          <div className="lp-frames">
            {/* Main frame — comparison table */}
            <div className="lp-frame-main">
              <div className="lp-frame-bar">
                <span className="lp-frame-label">
                  <span className="lp-live-dot" />
                  {t('home.demoLabel')}
                </span>
                <span className="lp-frame-time">15:30 ↺</span>
              </div>
              <table className="lp-tbl">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>KIS</th>
                    <th>VNDirect</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {DEMO.map(r => (
                    <tr key={r.sym} className={r.ok ? '' : 'lp-tbl-disc'}>
                      <td className="lp-tbl-sym">{r.sym}</td>
                      <td className="lp-tbl-num">{r.kis}</td>
                      <td className={`lp-tbl-num${r.ok ? '' : ' lp-tbl-diff'}`}>{r.vnd}</td>
                      <td>
                        {r.ok
                          ? <span className="lp-ok">✓ {t('home.match')}</span>
                          : <span className="lp-warn">✗ {r.d}</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Secondary frame — alert card */}
            <div className="lp-frame-alert">
              <div className="lp-alert-icon">⚠</div>
              <div className="lp-alert-body">
                <div className="lp-alert-title">{t('home.alertTitle')}</div>
                <div className="lp-alert-sub">HPG · KIS 31.200 vs VNDirect 31.350 · Δ +150đ</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  )
}

// ─── Features ─────────────────────────────────────────────────
function Features() {
  const { t } = useTranslation()

  const handleMouseMove = (e) => {
    const card = e.currentTarget
    const rect = card.getBoundingClientRect()
    card.style.setProperty('--mx', `${e.clientX - rect.left}px`)
    card.style.setProperty('--my', `${e.clientY - rect.top}px`)
  }
  const handleMouseLeave = (e) => {
    e.currentTarget.style.setProperty('--mx', '50%')
    e.currentTarget.style.setProperty('--my', '50%')
  }

  return (
    <section className="lp-section" id="features">
      <div className="lp-wrap">
        <p className="lp-eyebrow lp-eyebrow--left">{t('home.featEyebrow')}</p>
        <h2 className="lp-h2">{t('home.featH2')}</h2>
        <div className="lp-feat-grid">
          {FEAT_DEFS.map(({ Icon, clr, key }) => (
            <div
              key={key}
              className="lp-feat"
              style={{ '--accent': clr }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <div className={`lp-feat-icon lp-feat-icon--${key}`} style={{ '--clr': clr }}>
                <Icon size={22} strokeWidth={1.6} />
              </div>
              <div>
                <h3 className="lp-feat-title">{t(`home.${key}Title`)}</h3>
                <p className="lp-feat-desc">{t(`home.${key}Desc`)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Stats ────────────────────────────────────────────────────
function Stats() {
  const { t } = useTranslation()
  return (
    <section className="lp-stats-band">
      <div className="lp-wrap lp-stats-grid">
        {STAT_DEFS.map(({ n, lbl, sub }) => (
          <div key={lbl} className="lp-stat">
            <div className="lp-stat-n">{n}</div>
            <div className="lp-stat-lbl">{t(`home.${lbl}`)}</div>
            <div className="lp-stat-sub">{t(`home.${sub}`)}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Tech logo SVGs ───────────────────────────────────────────
function TechLogo({ tech, color, size = 16 }) {
  if (tech === 'nodejs') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2L21.5 7.5V16.5L12 22L2.5 16.5V7.5L12 2Z"
        fill={color} fillOpacity="0.13" stroke={color} strokeWidth="1.3" strokeLinejoin="round"/>
      <text x="12" y="15.2" textAnchor="middle" fontSize="7" fontWeight="700"
        fill={color} fontFamily="monospace">JS</text>
    </svg>
  )
  if (tech === 'mongodb') return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M12 2C12 2 7.5 8 7.5 13.5C7.5 17.09 9.46 20 12 21C14.54 20 16.5 17.09 16.5 13.5C16.5 8 12 2 12 2Z"
        fill={color} fillOpacity="0.9"/>
      <line x1="12" y1="15" x2="12" y2="22" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  )
  if (tech === 'react') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="2.2" fill={color}/>
      <ellipse cx="12" cy="12" rx="10" ry="3.5" stroke={color} strokeWidth="1.2"/>
      <ellipse cx="12" cy="12" rx="10" ry="3.5" stroke={color} strokeWidth="1.2" transform="rotate(60 12 12)"/>
      <ellipse cx="12" cy="12" rx="10" ry="3.5" stroke={color} strokeWidth="1.2" transform="rotate(120 12 12)"/>
    </svg>
  )
  if (tech === 'tailwind') return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M12 6c-2.7 0-4.4 1.35-5.1 4.05 1.02-1.35 2.2-1.86 3.57-1.53.78.19 1.33.76 1.95 1.39C13.38 11.78 14.78 13.2 18 13.2c2.7 0 4.4-1.35 5.1-4.05-1.02 1.35-2.2 1.86-3.57 1.53-.78-.19-1.33-.76-1.95-1.39C16.62 8.42 15.22 7 12 7z" fill={color}/>
      <path d="M6 13.2c-2.7 0-4.4 1.35-5.1 4.05 1.02-1.35 2.2-1.86 3.57-1.53.78.19 1.33.76 1.95 1.39C7.38 18.58 8.78 20 12 20c2.7 0 4.4-1.35 5.1-4.05-1.02 1.35-2.2 1.86-3.57 1.53-.78-.19-1.33-.76-1.95-1.39C10.62 15.22 9.22 13.8 6 13.8z" fill={color}/>
    </svg>
  )
  if (tech === 'socketio') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="4.5" r="2" fill={color}/>
      <circle cx="4.5" cy="18" r="2" fill={color}/>
      <circle cx="19.5" cy="18" r="2" fill={color}/>
      <path d="M12 6.5L5.5 16M12 6.5L18.5 16M6.5 18H17.5"
        stroke={color} strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  )
  if (tech === 'scheduler') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 7v5l3.5 2"/>
    </svg>
  )
  const abbr = { kis: 'KIS', vnd: 'VND', tcbs: 'TCB' }[tech] ?? tech.slice(0, 3).toUpperCase()
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect x="2" y="2" width="20" height="20" rx="5"
        fill={color} fillOpacity="0.18"/>
      <rect x="2" y="2" width="20" height="20" rx="5"
        fill="none" stroke={color} strokeWidth="1.2" strokeOpacity="0.5"/>
      <text x="12" y="15.5" textAnchor="middle" fontSize="6.5" fontWeight="800"
        fill={color} fontFamily="monospace">{abbr}</text>
    </svg>
  )
}

// ─── Architecture ─────────────────────────────────────────────
function Arch() {
  const { t } = useTranslation()
  return (
    <section className="lp-section lp-arch-bg">
      <div className="lp-wrap">
        <p className="lp-eyebrow lp-eyebrow--left">{t('home.archEyebrow')}</p>
        <h2 className="lp-h2">{t('home.archH2')}</h2>
        <div className="lp-arch-flow">
          {ARCH_DEFS.flatMap(({ Icon, lbl, colColor, items }, i) => [
            <div key={lbl} className="lp-arch-col" style={{ '--col-color': colColor }}>
              <div className="lp-arch-head">
                <div className="lp-arch-head-icon">
                  <Icon size={14} strokeWidth={1.5} />
                </div>
                {t(`home.${lbl}`)}
              </div>
              <div className="lp-arch-items">
                {items.map(({ name, tech, techColor }) => (
                  <div key={name} className="lp-arch-item">
                    <span className="lp-arch-item-logo">
                      <TechLogo tech={tech} color={techColor} size={16} />
                    </span>
                    <span className="lp-arch-item-name">{name}</span>
                  </div>
                ))}
              </div>
            </div>,
            i < ARCH_DEFS.length - 1 ? (
              <div key={`conn-${i}`} className="lp-arch-connector"
                aria-hidden="true" style={{ '--delay': `${i * 0.7}s` }}>
                <div className="lp-arch-connector-line" />
                <div className="lp-arch-connector-dot" />
              </div>
            ) : null,
          ])}
        </div>
      </div>
    </section>
  )
}

// ─── CTA ──────────────────────────────────────────────────────
function Cta() {
  const { t } = useTranslation()
  return (
    <section className="lp-cta-section">
      <div className="lp-wrap lp-cta-inner">
        <div className="lp-cta-proof">
          <span className="lp-cta-proof-dot" />
          {t('home.ctaProof')}
        </div>
        <h2 className="lp-cta-h">{t('home.ctaH')}</h2>
        <p className="lp-cta-sub">{t('home.ctaSub')}</p>
        <div className="lp-cta-btn-wrap">
          <div className="lp-cta-glow-ring" aria-hidden="true" />
          <Link to="/dashboard" className="lp-btn-cta lp-btn-cta--purple">
            {t('home.ctaGo')} <ArrowRight size={14} strokeWidth={2.2} />
          </Link>
        </div>
        <div className="lp-cta-badges">
          <span className="lp-cta-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
            {t('home.ctaBadge1')}
          </span>
          <span className="lp-cta-badge-sep" aria-hidden="true">·</span>
          <span className="lp-cta-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            {t('home.ctaBadge2')}
          </span>
          <span className="lp-cta-badge-sep" aria-hidden="true">·</span>
          <span className="lp-cta-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            {t('home.ctaBadge3')}
          </span>
        </div>
      </div>
    </section>
  )
}

// ─── CSS ──────────────────────────────────────────────────────
const CSS = `
/* ── Root wrapper — always dark, breaks out of main container ── */
.lp {
  font-family: 'Be Vietnam Pro', system-ui, sans-serif;
  margin: -1.5rem -1rem 0;
  overflow-x: hidden;
  background: #080810;
  color: rgba(255,255,255,0.85);
}
@media (min-width: 640px) { .lp { margin-left: -1.5rem; margin-right: -1.5rem; } }

/* ── Shared ── */
.lp-wrap {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 1.5rem;
}
.lp-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.65rem;
  letter-spacing: 0.14em;
  color: rgba(167,139,250,0.7);
  text-transform: uppercase;
  margin-bottom: 1.25rem;
}
.lp-eyebrow--left { display: flex; }
.lp-pulse {
  width: 7px; height: 7px;
  background: #a78bfa;
  border-radius: 50%;
  box-shadow: 0 0 0 0 rgba(167,139,250,0.5);
  animation: lp-pulse 2.5s ease-in-out infinite;
  flex-shrink: 0;
}
@keyframes lp-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(167,139,250,.5); }
  60%  { box-shadow: 0 0 0 6px rgba(167,139,250,0); }
  100% { box-shadow: 0 0 0 0 rgba(167,139,250,0); }
}
.lp-h2 {
  font-family: 'Exo 2', sans-serif;
  font-weight: 800;
  font-size: clamp(1.75rem, 3.5vw, 2.5rem);
  line-height: 1.12;
  letter-spacing: -0.03em;
  color: #fff;
  text-wrap: balance;
  margin-bottom: 2.75rem;
}
.lp-section {
  padding: 5rem 0;
  border-top: 1px solid rgba(124,58,237,0.18);
}

/* ── Hero — WebGL shader background ── */
.lp-hero {
  position: relative;
  overflow: hidden;
  min-height: calc(100vh - 60px);
  padding: 5rem 1.5rem 5rem;
  background: #0a0502;
  display: flex;
  align-items: center;
}
.lp-shader-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  touch-action: none;
  z-index: 0;
  object-fit: cover;
}
.lp-hero-inner {
  position: relative;
  z-index: 1;
  max-width: 1100px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr;
  gap: 3rem;
  align-items: center;
  width: 100%;
}
@media (min-width: 900px) {
  .lp-hero-inner { grid-template-columns: 1fr 1fr; gap: 4rem; }
}

/* Hero — warm-color overrides */
.lp-hero .lp-eyebrow { color: rgba(251,191,36,0.78); }
.lp-hero .lp-pulse {
  background: #fbbf24;
  box-shadow: 0 0 0 0 rgba(251,191,36,0.5);
  animation: lp-pulse-warm 2.5s ease-in-out infinite;
}
@keyframes lp-pulse-warm {
  0%   { box-shadow: 0 0 0 0 rgba(251,191,36,.5); }
  60%  { box-shadow: 0 0 0 6px rgba(251,191,36,0); }
  100% { box-shadow: 0 0 0 0 rgba(251,191,36,0); }
}
.lp-hero .lp-dotgrid {
  background-image: radial-gradient(rgba(251,146,60,0.18) 1.5px, transparent 1.5px);
}
.lp-hero .lp-frame-main {
  box-shadow: 0 0 60px rgba(234,88,12,0.18), 0 8px 32px rgba(0,0,0,0.4);
}

/* Left */
.lp-left { display: flex; flex-direction: column; gap: 0; }
.lp-h1 {
  font-family: 'Exo 2', sans-serif;
  font-weight: 900;
  font-size: clamp(2.5rem, 5.5vw, 4.25rem);
  line-height: 1.05;
  letter-spacing: -0.04em;
  color: #fff;
  text-wrap: balance;
  margin: 0 0 1.25rem;
}
.lp-h1 em {
  font-style: italic;
  color: #fbbf24;
}
.lp-lead {
  font-size: clamp(0.9rem, 1.6vw, 1.05rem);
  color: rgba(255,255,255,0.58);
  line-height: 1.7;
  margin: 0 0 2rem;
  max-width: 420px;
}
.lp-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1.75rem;
}
.lp-btn-cta {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.65rem 1.4rem;
  background: #ea580c;
  color: #fff;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
  border: 1px solid rgba(251,146,60,0.4);
  transition: background 0.15s, box-shadow 0.15s;
}
.lp-btn-cta:hover {
  background: #c2410c;
  box-shadow: 0 0 28px rgba(234,88,12,0.55);
}
.lp-btn-outline {
  display: inline-flex;
  align-items: center;
  padding: 0.65rem 1.2rem;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(255,255,255,0.7);
  text-decoration: none;
  transition: border-color 0.15s, color 0.15s;
}
.lp-btn-outline:hover { border-color: #fbbf24; color: #fbbf24; }
.lp-chips {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.lp-chip {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.68rem;
  color: rgba(255,255,255,0.32);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 4px;
  padding: 0.2rem 0.55rem;
  letter-spacing: 0.04em;
}

/* Right — framed visual */
.lp-right {
  position: relative;
  padding: 2.5rem 1.5rem 3rem;
}
.lp-dotgrid {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(167,139,250,0.22) 1.5px, transparent 1.5px);
  background-size: 22px 22px;
  border-radius: 16px;
  pointer-events: none;
}
.lp-frames {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
@media (min-width: 900px) {
  .lp-frames {
    display: block;
    height: 360px;
  }
  .lp-frame-main {
    position: absolute;
    top: 0; left: 0; right: 60px;
  }
  .lp-frame-alert {
    position: absolute;
    bottom: 0; right: 0;
    width: 240px;
  }
}

/* Main frame — glass dark */
.lp-frame-main {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 0 60px rgba(124,58,237,0.2), 0 8px 32px rgba(0,0,0,0.4);
  backdrop-filter: blur(16px);
}
.lp-frame-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 1rem;
  background: rgba(0,0,0,0.3);
  border-bottom: 1px solid rgba(255,255,255,0.07);
}
.lp-frame-label {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.68rem;
  color: rgba(255,255,255,0.55);
  letter-spacing: 0.03em;
}
.lp-live-dot {
  width: 6px; height: 6px;
  background: #4ade80;
  border-radius: 50%;
  flex-shrink: 0;
  animation: lp-blink 2.4s ease-in-out infinite;
}
@keyframes lp-blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.25; }
}
.lp-frame-time {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.65rem;
  color: rgba(255,255,255,0.28);
}
.lp-tbl {
  width: 100%;
  border-collapse: collapse;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8rem;
}
.lp-tbl thead tr { border-bottom: 1px solid rgba(255,255,255,0.07); }
.lp-tbl th {
  padding: 0.45rem 0.875rem;
  text-align: left;
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.35);
  font-weight: 500;
}
.lp-tbl td {
  padding: 0.55rem 0.875rem;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.75);
}
.lp-tbl tr:last-child td { border-bottom: none; }
.lp-tbl-sym { font-weight: 600; color: #fff !important; }
.lp-tbl-num { font-variant-numeric: tabular-nums; }
.lp-tbl-diff { color: #fbbf24 !important; }
.lp-tbl-disc { animation: lp-disc 3.2s ease-in-out infinite; }
@keyframes lp-disc {
  0%, 100% { background: rgba(0,0,0,0); }
  50%       { background: rgba(251,191,36,0.08); }
}
.lp-ok {
  font-size: 0.68rem;
  font-weight: 600;
  color: #4ade80;
  background: rgba(74,222,128,0.1);
  border: 1px solid rgba(74,222,128,0.22);
  border-radius: 4px;
  padding: 0.15rem 0.45rem;
  white-space: nowrap;
}
.lp-warn {
  font-size: 0.68rem;
  font-weight: 600;
  color: #fbbf24;
  background: rgba(251,191,36,0.1);
  border: 1px solid rgba(251,191,36,0.25);
  border-radius: 4px;
  padding: 0.15rem 0.45rem;
  white-space: nowrap;
}

/* Alert frame — glass dark */
.lp-frame-alert {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  border-left: 3px solid #f59e0b;
  border-radius: 10px;
  padding: 0.875rem 1rem;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  box-shadow: 0 4px 24px rgba(0,0,0,0.35);
  backdrop-filter: blur(12px);
}
.lp-alert-icon {
  font-size: 1rem;
  flex-shrink: 0;
  margin-top: 0.05rem;
}
.lp-alert-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: rgba(255,255,255,0.9);
  margin-bottom: 0.2rem;
}
.lp-alert-sub {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.66rem;
  color: rgba(255,255,255,0.38);
  line-height: 1.5;
}

/* ── Features ── */
.lp-section { background: #0c0c1a; }
.lp-feat-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
}
@media (min-width: 640px) { .lp-feat-grid { grid-template-columns: 1fr 1fr; } }

/* Card base — mouse spotlight via --mx/--my */
.lp-feat {
  --mx: 50%;
  --my: 50%;
  --accent: #7c3aed;
  position: relative;
  overflow: hidden;
  display: flex;
  gap: 1.125rem;
  align-items: flex-start;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  padding: 1.5rem;
  transition: transform 0.28s cubic-bezier(.2,.8,.3,1), box-shadow 0.28s ease, border-color 0.28s ease;
  cursor: default;
}

/* Spotlight overlay */
.lp-feat::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(280px circle at var(--mx) var(--my), color-mix(in srgb, var(--accent) 15%, transparent), transparent 65%);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}
.lp-feat:hover::before { opacity: 1; }
.lp-feat:hover {
  transform: translateY(-6px);
  border-color: color-mix(in srgb, var(--accent) 45%, transparent);
  box-shadow: 0 16px 48px rgba(0,0,0,0.45), 0 0 0 1px color-mix(in srgb, var(--accent) 20%, transparent);
}

/* Icon — gradient ring + glow */
.lp-feat-icon {
  --clr: #7c3aed;
  width: 48px; height: 48px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 12px;
  flex-shrink: 0;
  color: var(--clr);
  background: radial-gradient(circle at 35% 35%, color-mix(in srgb, var(--clr) 22%, transparent), color-mix(in srgb, var(--clr) 6%, transparent) 75%);
  border: 1px solid color-mix(in srgb, var(--clr) 38%, transparent);
  transition: transform 0.28s ease, box-shadow 0.28s ease;
  position: relative;
  z-index: 1;
}
.lp-feat:hover .lp-feat-icon {
  transform: scale(1.1);
  box-shadow: 0 0 24px color-mix(in srgb, var(--clr) 45%, transparent);
}

.lp-feat-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: #fff;
  margin: 0 0 0.4rem;
  transition: color 0.2s;
}
.lp-feat:hover .lp-feat-title {
  color: color-mix(in srgb, var(--accent) 30%, #fff);
}
.lp-feat-desc {
  font-size: 0.875rem;
  color: rgba(255,255,255,0.52);
  line-height: 1.65;
  margin: 0;
}

/* ── Icon micro-animations ── */
/* feat1 — BarChart3: bars grow up */
.lp-feat-icon--feat1 svg {
  transition: transform 0.3s ease;
  transform-origin: center bottom;
}
.lp-feat:hover .lp-feat-icon--feat1 svg { transform: scaleY(1.2) translateY(-1px); }

/* feat2 — Bell: ring shake */
@keyframes lp-ring {
  0%, 100% { transform: rotate(0deg); }
  18%  { transform: rotate(-20deg); }
  36%  { transform: rotate(18deg); }
  54%  { transform: rotate(-12deg); }
  72%  { transform: rotate(10deg); }
  88%  { transform: rotate(-5deg); }
}
.lp-feat:hover .lp-feat-icon--feat2 svg {
  animation: lp-ring 0.65s ease;
  transform-origin: 50% 10%;
}

/* feat3 — ScrollText: float up */
.lp-feat-icon--feat3 svg {
  transition: transform 0.35s ease;
}
.lp-feat:hover .lp-feat-icon--feat3 svg { transform: translateY(-4px); }

/* feat4 — RefreshCw: spin forward */
.lp-feat-icon--feat4 svg {
  transition: transform 0.55s cubic-bezier(.4,0,.2,1);
}
.lp-feat:hover .lp-feat-icon--feat4 svg { transform: rotate(200deg); }

/* ── Stats ── */
.lp-stats-band {
  background: #080810;
  border-top: 1px solid rgba(124,58,237,0.18);
  border-bottom: 1px solid rgba(124,58,237,0.18);
  padding: 3.5rem 0;
}
.lp-stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2.5rem 1.5rem;
}
@media (min-width: 640px) { .lp-stats-grid { grid-template-columns: repeat(4, 1fr); } }
.lp-stat { text-align: center; }
.lp-stat-n {
  font-family: 'JetBrains Mono', monospace;
  font-size: clamp(2rem, 4.5vw, 3rem);
  font-weight: 500;
  color: #a78bfa;
  line-height: 1;
  margin-bottom: 0.4rem;
  font-variant-numeric: tabular-nums;
}
.lp-stat-lbl {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(255,255,255,0.8);
  margin-bottom: 0.2rem;
}
.lp-stat-sub {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.65rem;
  color: rgba(255,255,255,0.32);
  letter-spacing: 0.04em;
}

/* ── Architecture ── */
.lp-arch-bg { background: #0c0c1a; }
.lp-arch-flow {
  display: flex;
  align-items: stretch;
}
@media (max-width: 639px) {
  .lp-arch-flow { flex-direction: column; gap: 1rem; }
}
.lp-arch-col {
  --col-color: #a78bfa;
  flex: 1;
  min-width: 0;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  overflow: hidden;
  transition: border-color 0.25s ease, box-shadow 0.25s ease;
}
.lp-arch-col:hover {
  border-color: color-mix(in srgb, var(--col-color) 40%, transparent);
  box-shadow: 0 0 30px color-mix(in srgb, var(--col-color) 12%, transparent);
}
.lp-arch-head {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.8rem 1rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--col-color);
  background: color-mix(in srgb, var(--col-color) 8%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--col-color) 18%, transparent);
}
.lp-arch-head-icon {
  width: 24px; height: 24px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 6px;
  background: color-mix(in srgb, var(--col-color) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--col-color) 28%, transparent);
  color: var(--col-color);
  flex-shrink: 0;
}
.lp-arch-items { display: flex; flex-direction: column; }
.lp-arch-item {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.6rem 1rem;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  transition: background 0.15s;
}
.lp-arch-item:last-child { border-bottom: none; }
.lp-arch-item:hover { background: rgba(255,255,255,0.04); }
.lp-arch-item-logo { flex-shrink: 0; display: flex; align-items: center; line-height: 0; }
.lp-arch-item-name {
  font-size: 0.81rem;
  color: rgba(255,255,255,0.72);
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Animated flow connector */
.lp-arch-connector {
  --delay: 0s;
  width: 48px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
@media (max-width: 639px) { .lp-arch-connector { display: none; } }

.lp-arch-connector-line {
  position: absolute;
  left: 4px; right: 4px;
  height: 1.5px;
  background: linear-gradient(90deg, rgba(124,58,237,0.2), rgba(167,139,250,0.65), rgba(124,58,237,0.2));
}
.lp-arch-connector-dot {
  position: absolute;
  width: 8px; height: 8px;
  border-radius: 50%;
  background: #a78bfa;
  box-shadow: 0 0 10px 2px rgba(167,139,250,0.65);
  animation-name: lp-flow;
  animation-duration: 1.8s;
  animation-timing-function: ease-in-out;
  animation-delay: var(--delay, 0s);
  animation-iteration-count: infinite;
}
@keyframes lp-flow {
  0%   { left: 4px;               opacity: 0; }
  10%  {                           opacity: 1; }
  90%  {                           opacity: 1; }
  100% { left: calc(100% - 12px); opacity: 0; }
}

/* ── CTA — bottom purple glow, mirrors hero ── */
.lp-cta-section {
  padding: 7rem 0 6rem;
  border-top: 1px solid rgba(251,146,60,0.12);
  background:
    radial-gradient(ellipse 60% 55% at 50% 100%, rgba(234,88,12,0.18) 0%, transparent 70%),
    radial-gradient(ellipse 80% 60% at 50% 110%, rgba(124,58,237,0.14) 0%, transparent 65%),
    #080810;
  text-align: center;
}
.lp-cta-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.9rem;
}
/* Social proof line */
.lp-cta-proof {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.65rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(251,191,36,0.65);
  background: rgba(251,191,36,0.06);
  border: 1px solid rgba(251,191,36,0.15);
  border-radius: 100px;
  padding: 0.3rem 0.8rem;
}
.lp-cta-proof-dot {
  width: 5px; height: 5px;
  background: #fbbf24;
  border-radius: 50%;
  box-shadow: 0 0 6px 1px rgba(251,191,36,0.6);
  animation: lp-pulse-warm 2.5s ease-in-out infinite;
  flex-shrink: 0;
}
.lp-cta-h {
  font-family: 'Exo 2', sans-serif;
  font-weight: 800;
  font-size: clamp(1.75rem, 3.8vw, 2.75rem);
  letter-spacing: -0.03em;
  color: #fff;
  margin: 0;
  text-wrap: balance;
}
.lp-cta-sub {
  font-size: 0.9rem;
  color: rgba(255,255,255,0.42);
  margin: 0;
  max-width: 340px;
}
/* Button + glow ring wrapper */
.lp-cta-btn-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 0.5rem;
}
.lp-cta-glow-ring {
  position: absolute;
  inset: -10px;
  border-radius: 16px;
  background: transparent;
  border: 1px solid rgba(124,58,237,0.0);
  box-shadow: 0 0 0 0 rgba(124,58,237,0);
  animation: lp-cta-ring 2.8s ease-in-out infinite;
  pointer-events: none;
}
@keyframes lp-cta-ring {
  0%   { box-shadow: 0 0 0 0 rgba(124,58,237,0.55); border-color: rgba(124,58,237,0.4); }
  60%  { box-shadow: 0 0 0 14px rgba(124,58,237,0); border-color: rgba(124,58,237,0); }
  100% { box-shadow: 0 0 0 0 rgba(124,58,237,0);   border-color: rgba(124,58,237,0); }
}
/* Purple variant override for CTA button */
.lp-btn-cta--purple {
  background: #7c3aed;
  border-color: rgba(167,139,250,0.35);
}
.lp-btn-cta--purple:hover {
  background: #6d28d9;
  box-shadow: 0 0 28px rgba(124,58,237,0.55);
}
/* Badges row */
.lp-cta-badges {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-top: 0.25rem;
}
.lp-cta-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.72rem;
  color: rgba(255,255,255,0.32);
  letter-spacing: 0.02em;
}
.lp-cta-badge svg { opacity: 0.5; }
.lp-cta-badge-sep {
  color: rgba(255,255,255,0.18);
  font-size: 0.8rem;
  line-height: 1;
}
`
