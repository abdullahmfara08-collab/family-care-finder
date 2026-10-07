import { useEffect, useState } from 'react'
import { GUIDELINE_YEAR, STATES, checkCoverage, type CoverageResult } from './lib/coverage'
import { clinicsNear, loadMeta, placeForZip, type Result } from './lib/data'
import { strings, type Lang } from './i18n'
import type { Insurance, Meta, Place } from './types'
import { EVENTS, track } from './lib/metrics'

type Screen = 'home' | 'results' | 'clinic' | 'coverage' | 'privacy' | 'terms' | 'help' | 'impact'
const INSURANCE: Insurance[] = ['medicaid', 'chip', 'marketplace', 'medicare', 'uninsured', 'unsure']
const REPORT_EMAIL = import.meta.env.VITE_REPORT_EMAIL as string | undefined
const CONTACT_EMAIL = (import.meta.env.VITE_CONTACT_EMAIL as string | undefined) || 'abdullahmfara.08@gmail.com'
const HASH_PAGES: Screen[] = ['privacy', 'terms', 'help', 'impact']
const pageFromHash = (): Screen | null => HASH_PAGES.find(p => location.hash === `#${p}`) ?? null

function stored<T extends string>(key: string, fallback: T): T {
  try {
    return (localStorage.getItem(key) as T) ?? fallback
  } catch {
    return fallback
  }
}
function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Private mode or blocked storage: the app still works, it just won't remember.
  }
}

export default function App() {
  const [lang, setLang] = useState<Lang>(() => stored('lang', navigator.language.startsWith('es') ? 'es' : 'en'))
  const t = strings[lang]
  const [screen, setScreen] = useState<Screen>(() => pageFromHash() ?? 'home')
  const [zip, setZip] = useState<string>(() => stored('zip', ''))
  const [insurance, setInsurance] = useState<Insurance>(() => stored('insurance', 'unsure'))
  const [place, setPlace] = useState<Place | null>(null)
  const [results, setResults] = useState<Result[]>([])
  const [selected, setSelected] = useState<Result | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [meta, setMeta] = useState<Meta | null>(null)

  useEffect(() => {
    loadMeta().then(setMeta)
  }, [])
  useEffect(() => {
    document.documentElement.lang = lang
    store('lang', lang)
  }, [lang])
  useEffect(() => {
    // Braces matter: newer browsers return a Promise from scrollTo, which React would call as a cleanup.
    window.scrollTo(0, 0)
  }, [screen])
  useEffect(() => {
    if (screen === 'help') track('open_help')
  }, [screen])
  useEffect(() => {
    const onHash = () => setScreen(pageFromHash() ?? 'home')
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  async function searchFrom(p: Place) {
    setPlace(p)
    setResults(await clinicsNear(p))
    setScreen('results')
  }

  async function searchZip(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    store('zip', zip)
    store('insurance', insurance)
    track('search_zip')
    const p = await placeForZip(zip.trim())
    if (p) await searchFrom(p)
    else setError(t.zipNotFound)
    setBusy(false)
  }

  function searchLocation() {
    setError('')
    if (!navigator.geolocation) return setError(t.locationDenied)
    setBusy(true)
    track('search_location')
    navigator.geolocation.getCurrentPosition(
      async pos => {
        await searchFrom({ lat: pos.coords.latitude, lon: pos.coords.longitude, label: t.useLocation.toLowerCase() })
        setBusy(false)
      },
      () => {
        setError(t.locationDenied)
        setBusy(false)
      },
      { timeout: 10000, maximumAge: 600000 },
    )
  }

  return (
    <div className="app">
      <header className="top">
        <button className="brand" onClick={() => { history.replaceState(null, '', location.pathname); setScreen('home') }}>
          {t.appName}
        </button>
        <button className="lang" onClick={() => { setLang(lang === 'en' ? 'es' : 'en'); track('switch_language') }} lang={lang === 'en' ? 'es' : 'en'}>
          {t.language}
        </button>
      </header>

      {meta?.demo && <p className="demo">{t.demoBanner}</p>}

      <main>
        {screen === 'home' && (
          <section>
            <h1>{t.tagline}</h1>
            <form onSubmit={searchZip} className="card">
              <label htmlFor="zip">{t.zipLabel}</label>
              <input
                id="zip"
                inputMode="numeric"
                autoComplete="postal-code"
                pattern="\d{5}"
                maxLength={5}
                placeholder={t.zipPlaceholder}
                value={zip}
                onChange={e => setZip(e.target.value.replace(/\D/g, ''))}
              />
              <fieldset>
                <legend>{t.insuranceLabel}</legend>
                <div className="choices">
                  {INSURANCE.map(i => (
                    <label key={i} className={insurance === i ? 'choice on' : 'choice'}>
                      <input type="radio" name="insurance" value={i} checked={insurance === i} onChange={() => setInsurance(i)} />
                      {t.insurance[i]}
                    </label>
                  ))}
                </div>
              </fieldset>
              {error && <p className="error" role="alert">{error}</p>}
              <button className="primary" disabled={busy || zip.length !== 5}>
                {busy ? t.locating : t.search}
              </button>
              <button type="button" className="secondary" onClick={searchLocation} disabled={busy}>
                {t.useLocation}
              </button>
            </form>
            <button className="link-card" onClick={() => setScreen('coverage')}>
              {t.coverageCta} →
            </button>
            <a className="link-card help-card" href="#help">{t.helpCta}</a>
            <p className="quiet">{t.privacy}</p>
          </section>
        )}

        {screen === 'results' && place && (
          <section>
            <button className="back" onClick={() => setScreen('home')}>← {t.back}</button>
            <h1>{t.resultsTitle(results.length, place.label)}</h1>
            <p className="note">{t.insuranceNote[insurance]}</p>
            {results.length === 0 && <p className="card">{t.noResults}</p>}
            <ul className="results">
              {results.map(c => (
                <li key={c.id} className="card">
                  <button className="result" onClick={() => { setSelected(c); setScreen('clinic'); track('open_clinic') }}>
                    <span className="name">{c.name}</span>
                    <span className="miles">{t.miles(c.miles)}</span>
                    <span className="addr">{c.address}, {c.city}</span>
                    {c.setting && t.settingLabels[c.setting] && <span className="setting">{t.settingLabels[c.setting]}</span>}
                    <Badges c={c} t={t} insurance={insurance} />
                  </button>
                  <Actions c={c} t={t} />
                </li>
              ))}
            </ul>
            <a className="link-card help-card" href="#help">{t.helpCta}</a>
            {meta && <p className="quiet">{t.sourceLine(meta.source, meta.lastChecked)}</p>}
          </section>
        )}

        {screen === 'clinic' && selected && (
          <section>
            <button className="back" onClick={() => setScreen('results')}>← {t.back}</button>
            <h1>{selected.name}</h1>
            {selected.org && selected.org !== selected.name && <p className="quiet">{selected.org}</p>}
            <p>{selected.address}, {selected.city}, {selected.state} {selected.zip} · {t.miles(selected.miles)}</p>
            {selected.setting && t.settingLabels[selected.setting] && <p className="note">{t.settingLabels[selected.setting]}</p>}
            <Badges c={selected} t={t} insurance={insurance} all />
            <Actions c={selected} t={t} />
            <ShareButton c={selected} t={t} />
            <p>{t.servicesNote}</p>
            <Checklist t={t} insured={insurance !== 'uninsured'} />
            <div className="card">
              <h2>{t.callScriptTitle}</h2>
              <ul className="script">
                {t.callScript(insurance === 'uninsured' || insurance === 'unsure' ? t.noInsuranceWord : t.insurance[insurance]).map(q => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </div>
            {meta && <p className="quiet">{t.sourceLine(meta.source, meta.lastChecked)}</p>}
            {REPORT_EMAIL && (
              <a
                className="quiet-link"
                href={`mailto:${REPORT_EMAIL}?subject=${encodeURIComponent(`${t.reportSubject}: ${selected.name}`)}&body=${encodeURIComponent(`${selected.name}\n${selected.address}, ${selected.city}\n\n`)}`}
              >
                {t.reportProblem}
              </a>
            )}
          </section>
        )}

        {screen === 'coverage' && (
          <Coverage t={t} initialState={place?.state} onBack={() => setScreen('home')} />
        )}

        {screen === 'help' && (
          <section>
            <a className="back" href="#">← {t.back}</a>
            <h1>{t.helpTitle}</h1>
            <p>{t.helpIntro}</p>
            <div className="help-list">
              {t.helpCards.map(c => (
                <article key={c.title} className="card">
                  <h2>{c.title}</h2>
                  <p>{c.body}</p>
                  {'link' in c && c.link && <a href={c.link.href} target="_blank" rel="noreferrer">{c.link.label} ↗</a>}
                </article>
              ))}
            </div>
          </section>
        )}

        {screen === 'impact' && <Impact t={t} />}

        {(screen === 'privacy' || screen === 'terms') && (
          <section className="legal">
            <a className="back" href="#">← {t.back}</a>
            <h1>{screen === 'privacy' ? t.privacyTitle : t.termsTitle}</h1>
            {(screen === 'privacy' ? t.privacyBody : t.termsBody).map(p => <p key={p}>{p}</p>)}
            {CONTACT_EMAIL && <p>{t.contactLine(CONTACT_EMAIL)}</p>}
          </section>
        )}
      </main>

      <footer className="foot">
        <p className="emergency">{t.emergency}</p>
        <div className="maker">
          <img src={`${import.meta.env.BASE_URL}clear-week-icon.png`} alt="" width="28" height="28" />
          <span>{t.appName} · {t.madeBy}</span>
        </div>
        <nav className="legal-links">
          <a href="#privacy">{t.privacyLink}</a>
          <a href="#terms">{t.termsLink}</a>
          <a href="#impact">{t.impactLink}</a>
        </nav>
      </footer>
    </div>
  )
}

type T = (typeof strings)['en']

function Badges({ c, t, insurance, all }: { c: Result; t: T; insurance: Insurance; all?: boolean }) {
  const wantsMedicaid = insurance === 'medicaid' || insurance === 'chip'
  const badges = [
    c.slidingScale && t.badges.sliding,
    c.acceptsMedicaid && (all || wantsMedicaid) && t.badges.medicaid,
    c.acceptsMedicare && (all || insurance === 'medicare') && t.badges.medicare,
    c.servesUninsured && (all || insurance === 'uninsured') && t.badges.uninsured,
  ].filter(Boolean) as string[]
  return (
    <span className="badges">
      {badges.map(b => <span key={b} className="badge">✓ {b}</span>)}
    </span>
  )
}

function Actions({ c, t }: { c: Result; t: T }) {
  const maps = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${c.address}, ${c.city}, ${c.state} ${c.zip}`)}`
  const site = c.website && (c.website.startsWith('http') ? c.website : `https://${c.website}`)
  return (
    <div className="actions">
      {c.phone && <a className="primary" href={`tel:${c.phone.replace(/[^\d+]/g, '')}`} onClick={() => track('tap_call')}>{t.call} {c.phone}</a>}
      <a className="secondary" href={maps} target="_blank" rel="noreferrer" onClick={() => track('tap_directions')}>{t.directions}</a>
      {site && <a className="secondary" href={site} target="_blank" rel="noreferrer">{t.website}</a>}
    </div>
  )
}

function ShareButton({ c, t }: { c: Result; t: T }) {
  const [copied, setCopied] = useState(false)
  async function share() {
    const text = t.shareText(c.name, `${c.address}, ${c.city}, ${c.state} ${c.zip}`, c.phone)
    track('share_clinic')
    try {
      if (navigator.share) return await navigator.share({ text })
    } catch {
      // Cancelled or not allowed: fall back to copying.
    }
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }
  return (
    <div className="share">
      <button type="button" className="secondary" onClick={share}>{t.share}</button>
      {copied && <p className="quiet" role="status">{t.copied}</p>}
    </div>
  )
}

function Checklist({ t, insured }: { t: T; insured: boolean }) {
  const [done, setDone] = useState<Set<number>>(new Set())
  const items = t.bringItems(insured ? t.bringInsurance : t.bringNoInsurance)
  return (
    <div className="card">
      <h2>{t.bringTitle}</h2>
      <ul className="checklist">
        {items.map((item, i) => (
          <li key={item}>
            <label>
              <input
                type="checkbox"
                checked={done.has(i)}
                onChange={() => {
                  const next = new Set(done)
                  if (next.has(i)) next.delete(i)
                  else next.add(i)
                  setDone(next)
                }}
              />
              <span>{item}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Impact({ t }: { t: T }) {
  const [rows, setRows] = useState<{ event: string; total: number }[] | null>(null)
  const [since, setSince] = useState<string | null>(null)
  useEffect(() => {
    fetch('/api/stats')
      .then(r => (r.ok ? r.json() : null))
      .then((d: { since: string | null; totals: { event: string; total: number }[] } | null) => {
        setRows(d?.totals ?? [])
        setSince(d?.since ?? null)
      })
      .catch(() => setRows([]))
  }, [])
  const label = (e: string) => t.impactEvents[e as keyof T['impactEvents']] ?? e
  const known = (rows ?? []).filter(r => (EVENTS as readonly string[]).includes(r.event))
  return (
    <section>
      <a className="back" href="#">← {t.back}</a>
      <h1>{t.impactTitle}</h1>
      <p className="quiet">{t.impactIntro}{since ? ` ${since} →` : ''}</p>
      {rows && known.length === 0 && <p className="card">{t.impactNone}</p>}
      <dl className="impact">
        {known.map(r => (
          <div key={r.event}>
            <dt>{label(r.event)}</dt>
            <dd>{r.total.toLocaleString()}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function Coverage({ t, initialState, onBack }: { t: T; initialState?: string; onBack: () => void }) {
  const [state, setState] = useState(initialState ?? '')
  const [people, setPeople] = useState(3)
  const [income, setIncome] = useState('')
  const [period, setPeriod] = useState<'month' | 'year'>('month')
  const [hasKids, setHasKids] = useState(true)
  const [pregnant, setPregnant] = useState(false)
  const [result, setResult] = useState<CoverageResult | null>(null)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const amount = Number(income.replace(/[^\d.]/g, ''))
    if (!Number.isFinite(amount)) return
    setResult(checkCoverage({ yearlyIncome: period === 'month' ? amount * 12 : amount, householdSize: people, state: state || undefined, hasKids, pregnant }))
    track('coverage_check')
  }

  const stateName = state ? STATES[state] : ''
  return (
    <section>
      <button className="back" onClick={onBack}>← {t.back}</button>
      <h1>{t.coverageTitle}</h1>
      <p>{t.coverageIntro}</p>
      <form className="card" onSubmit={submit}>
        <label htmlFor="state">{t.stateLabel}</label>
        <select id="state" value={state} onChange={e => { setState(e.target.value); setResult(null) }}>
          <option value="">—</option>
          {Object.entries(STATES).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
        </select>
        <label htmlFor="people">{t.householdLabel}</label>
        <div className="stepper">
          <button type="button" aria-label="−" onClick={() => setPeople(Math.max(1, people - 1))}>−</button>
          <output id="people">{people}</output>
          <button type="button" aria-label="+" onClick={() => setPeople(Math.min(12, people + 1))}>+</button>
        </div>
        <label htmlFor="income">{t.incomeLabel}</label>
        <div className="row">
          <input id="income" inputMode="decimal" placeholder="$" value={income} onChange={e => setIncome(e.target.value)} />
          <select value={period} onChange={e => setPeriod(e.target.value as 'month' | 'year')} aria-label={t.incomeLabel}>
            <option value="month">{t.perMonth}</option>
            <option value="year">{t.perYear}</option>
          </select>
        </div>
        <fieldset>
          <legend>{t.kidsLabel}</legend>
          <div className="choices">
            <label className={hasKids ? 'choice on' : 'choice'}><input type="radio" name="kids" checked={hasKids} onChange={() => setHasKids(true)} />{t.yes}</label>
            <label className={!hasKids ? 'choice on' : 'choice'}><input type="radio" name="kids" checked={!hasKids} onChange={() => setHasKids(false)} />{t.no}</label>
          </div>
        </fieldset>
        <label className="check-row"><input type="checkbox" checked={pregnant} onChange={e => setPregnant(e.target.checked)} />{t.pregnantLabel}</label>
        <button className="primary" disabled={!income}>{t.check}</button>
      </form>
      {result && (
        <div className="card result-box" role="status">
          <dl className="groups">
            <div><dt>{t.groups.adults}</dt><dd>{result.adults === 'gap' ? t.adultsResult.gap(stateName) : t.adultsResult[result.adults]}</dd></div>
            {result.kids && <div><dt>{t.groups.kids}</dt><dd>{t.kidsResult[result.kids]}</dd></div>}
            {result.pregnant && <div><dt>{t.groups.pregnant}</dt><dd>{t.pregnantResult[result.pregnant]}</dd></div>}
          </dl>
          <p>{t.discounts[result.clinicDiscount]}</p>
          <p className="quiet">{stateName && `${t.coverageStateNote(stateName)} `}{t.percentLine(result.percent)} {t.guidelineNote(GUIDELINE_YEAR)}</p>
          <div className="actions">
            <a className="primary" href="https://www.healthcare.gov/medicaid-chip/getting-medicaid-chip/" target="_blank" rel="noreferrer">{t.applyMedicaid}</a>
            <a className="secondary" href="https://www.healthcare.gov/" target="_blank" rel="noreferrer">{t.applyMarketplace}</a>
          </div>
          <p>{t.help211}</p>
        </div>
      )}
    </section>
  )
}
