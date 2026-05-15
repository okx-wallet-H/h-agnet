let publishedRuleSet = null
let draftRuleSet = null

function initializeSideQuestRuleRepository(initialRuleSet) {
  if (!publishedRuleSet) {
    publishedRuleSet = initialRuleSet
  }
}

function getPublishedSideQuestRuleSet() {
  return publishedRuleSet
}

function setPublishedSideQuestRuleSet(ruleSet) {
  publishedRuleSet = ruleSet

  return publishedRuleSet
}

function getDraftSideQuestRuleSet() {
  return draftRuleSet
}

function setDraftSideQuestRuleSet(ruleSet) {
  draftRuleSet = ruleSet

  return draftRuleSet
}

function clearDraftSideQuestRuleSet() {
  draftRuleSet = null
}

module.exports = {
  clearDraftSideQuestRuleSet,
  getDraftSideQuestRuleSet,
  getPublishedSideQuestRuleSet,
  initializeSideQuestRuleRepository,
  setDraftSideQuestRuleSet,
  setPublishedSideQuestRuleSet,
}
