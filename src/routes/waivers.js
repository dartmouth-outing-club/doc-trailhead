export function getWaiverView (req, res) {
  const waiver_fp = `waivers/${req.params.waiverPath}`
  res.render('views/waiver.njk', { waiver_fp })
}
