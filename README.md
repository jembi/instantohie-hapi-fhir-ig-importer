# Instantohie HAPI FHIR Implementation Guide Importer

This importer image differs from the base image as it requires npm.
The import JS script depends on `axios` and `adm-zip` node libraries which was not supported by the base docker image.
