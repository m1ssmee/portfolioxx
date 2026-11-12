// The visitors' book's store, for a deployment of the whole repository (Vercel's Root Directory
// left at the repository): the function itself is desk-src/api/visitors.js, which a deployment of
// desk-src alone serves directly. One source, handed over to here.
module.exports = async function handler(req, res) {
  const { default: visitors } = await import('../desk-src/api/visitors.js')
  return visitors(req, res)
}
