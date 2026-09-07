const DELETE_MESSAGE = "Workout plan deleted.";

function suppressDeletedPlanMessage(root = document) {
  const message = root.querySelector?.("#workout-builder-message") || (root.id === "workout-builder-message" ? root : null);
  if (!message) return;
  if (String(message.textContent || "").trim() !== DELETE_MESSAGE) return;
  message.textContent = "";
}

const observer = new MutationObserver(records => {
  for (const record of records) {
    if (record.target?.id === "workout-builder-message") suppressDeletedPlanMessage(record.target);
    record.addedNodes.forEach(node => {
      if (node.nodeType === 1) suppressDeletedPlanMessage(node);
    });
  }
});
observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });

document.addEventListener("click", event => {
  if (!event.target.closest?.("[data-delete-plan], .delete-plan-btn, .delete-workout-plan, [data-action='delete-plan']")) return;
  requestAnimationFrame(() => suppressDeletedPlanMessage());
  setTimeout(() => suppressDeletedPlanMessage(), 40);
}, true);

suppressDeletedPlanMessage();
