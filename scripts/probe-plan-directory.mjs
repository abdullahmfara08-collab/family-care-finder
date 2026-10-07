// Probes Centene's public FHIR Plan-Net provider directory (covers Meridian Illinois Medicaid)
// for known Chicago health center NPIs. Plain requests, read-only.
const BASE = 'https://iopc-pd.api.centene.com/iopc/pd/fhir/providerdirectory'
const NPIS = { 'Esperanza Little Village': '1477812030', 'ACCESS Centro Medico': '1194803213', 'Lawndale Christian': '1245289214' }

async function get(path) {
  const res = await fetch(BASE + path, { headers: { Accept: 'application/fhir+json' } })
  const text = await res.text()
  let body
  try { body = JSON.parse(text) } catch { body = text.slice(0, 300) }
  return { status: res.status, body }
}
const summary = (b) => typeof b === 'string' ? b : {
  type: b.resourceType, total: b.total,
  entries: (b.entry ?? []).slice(0, 10).map((e) => {
    const r = e.resource ?? {}
    return { type: r.resourceType, id: r.id, name: r.name ?? r.title,
      npi: (r.identifier ?? []).filter((i) => /npi/i.test(i.system ?? '')).map((i) => i.value),
      network: r.network?.map((n) => n.display ?? n.reference),
      address: r.address?.city ?? r.address?.[0]?.city, plan: r.type?.[0]?.text ?? r.plan?.[0]?.type?.text }
  }),
}

const steps = [
  ['metadata', '/metadata?_summary=true'],
  ['insurance plans', '/InsurancePlan?_count=50'],
  ['orgs in Chicago', '/Organization?address-city=Chicago&_count=5'],
  ['locations 60623', '/Location?address-postalcode=60623&_count=10'],
]
for (const [name, npi] of Object.entries(NPIS)) {
  steps.push([`org by NPI ${name}`, `/Organization?identifier=http://hl7.org/fhir/sid/us-npi|${npi}`])
}
for (const [label, path] of steps) {
  try {
    const { status, body } = await get(path)
    console.log(`\n## ${label} -> ${status}`)
    console.log(JSON.stringify(summary(body), null, 1).slice(0, 4000))
    // Follow affiliations for orgs found by NPI
    if (label.startsWith('org by NPI') && body.entry?.length) {
      const id = body.entry[0].resource.id
      const aff = await get(`/OrganizationAffiliation?participating-organization=Organization/${id}&_count=20`)
      console.log(`### affiliations -> ${aff.status}`)
      console.log(JSON.stringify(summary(aff.body), null, 1).slice(0, 4000))
    }
  } catch (err) {
    console.log(`\n## ${label} -> error ${err.message}`)
  }
}
