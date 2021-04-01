'use strict'

const axios = require('axios').default
const AdmZip = require('adm-zip')

const HAPI_FHIR_BASE_URL = process.env.HAPI_FHIR_BASE_URL
const HAPI_FHIR_BASE_PATH = process.env.HAPI_FHIR_BASE_PATH || '/fhir'
const IG_DEFINITIONS_URL = process.env.IG_DEFINITIONS_URL
const resourceTypes = ['CodeSystem', 'ConceptMap', 'ValueSet']

function buildResourceUrl(subPath) {
  const cleanPath = (path) => path.replace(/^\/+|\/+$/g, '')
  return `${HAPI_FHIR_BASE_URL}/${cleanPath(HAPI_FHIR_BASE_PATH)}/${cleanPath(subPath)}`
}

async function postToFHIRServer(data) {
  const resourceName = data.resourceType
  try {
    await axios.put(buildResourceUrl(`${resourceName}/${data.id}`), data)
    return `Successfully created ${resourceName} resource`
  } catch (err) {
    return new Error(`${resourceName} resource creation failed: ${err}`)
  }
}

async function getResources(url) {
  const response = await axios.get(url, { responseType: 'arraybuffer' })
  const zip = AdmZip(response.data)
  return zip
    .getEntries()
    .filter(
      entry =>
        entry.entryName.endsWith('.json') &&
        !entry.entryName.startsWith('ImplementationGuide')
    )
}

function findMatch({ file, resourceTypes }) {
  const regex = new RegExp(resourceTypes.join('|'), 'g')
  const match = file.match(regex)
  return match ? match[0] : null
}

function buildResourceCollectionsObject({ files, resourceTypes }) {
  const result = Object.create({ Other: [] })
  resourceTypes.forEach(resourceType => {
    result[resourceType] = []
  })

  files.forEach(file => {
    const match = findMatch({ file: file.entryName, resourceTypes })
    result[match || 'Other'].push(file)
  })

  return result
}

function getResourceType({ file, resourceTypes }) {
  const match = findMatch({ file, resourceTypes })
  return match || file.split(/-/)[0]
}

async function sendResources(resources) {
  if (!resources.length) return

  const resource = resources.pop()
  const data = resource.getData().toString('utf-8')
  await postToFHIRServer(JSON.parse(data))

  await sendResources(resources)
}

;(async function () {
  const resources = await getResources(IG_DEFINITIONS_URL)
  const resourceCollections = buildResourceCollectionsObject({
    files: resources,
    resourceTypes
  })

  try {
    await sendResources(
      resourceCollections.Other.concat(
        resourceCollections.ValueSet,
        resourceCollections.CodeSystem,
        resourceCollections.ConceptMap
      )
    )
    console.log('Posting of resources to Hapi FHIR successfully done')
  } catch (err) {
    console.log(err)
  }
})()
