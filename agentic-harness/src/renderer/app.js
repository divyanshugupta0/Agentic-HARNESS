// Renderer process logic
document.getElementById('start').addEventListener('click', async () => {
  const goal = document.getElementById('goal').value;
  const result = await window.api.sendMessage('agent:start', goal);
  document.getElementById('logs').textContent = JSON.stringify(result, null, 2);
});
