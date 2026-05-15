let publishedRuleSet = null
let draftRuleSet = null

function initializeScoringRuleRepository(initialRuleSet) {
  if (!publishedRuleSet) {
    publishedRuleSet = initialRuleSet
  }
}

function getPublishedScoringRuleSet() {
  return publishedRuleSet
}

function setPublishedScoringRuleSet(ruleSet) {
  publishedRuleSet = ruleSet

  return publishedRuleSet
}

function getDraftScoringRuleSet() {
  return draftRuleSet
}

function setDraftScoringRuleSet(ruleSet) {
  draftRuleSet = ruleSet

  return draftRuleSet
}

function clearDraftScoringRuleSet() {
  draftRuleSet = null
}

module.exports = {
  clearDraftScoringRuleSet,
  getDraftScoringRuleSet,
  getPublishedScoringRuleSet,
  initializeScoringRuleRepository,
  setDraftScoringRuleSet,
  setPublishedScoringRuleSet,
}
