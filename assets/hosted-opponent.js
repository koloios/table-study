// Slumbot deals and plays its own hands on its public, independently hosted table.
(() => {
  const url = "https://slumbot.com/";

  function mount(root) {
    root.innerHTML = `
      <section class="panel hosted-opponent">
        <h2>Play Slumbot</h2>
        <p>Take a seat against Eric Jackson’s heads-up no-limit Hold’em opponent, winner of the 2018 Annual Computer Poker Competition. You can play anonymously.</p>
        <p>Slumbot hosts and deals these hands. For hints and hand reviews, choose the Table Study practice opponent.</p>
        <div class="actions">
          <button type="button" class="btn main" data-load-slumbot>Load Slumbot’s table</button>
          <a class="btn" href="${url}" target="_blank" rel="noopener noreferrer">Open Slumbot in a new tab</a>
        </div>
      </section>`;

    const launch = root.querySelector("[data-load-slumbot]");
    launch.addEventListener("click", () => {
      const frame = document.createElement("iframe");
      frame.title = "Slumbot’s hosted heads-up poker table";
      frame.referrerPolicy = "no-referrer";
      frame.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms");
      frame.style.cssText = "display:block;width:100%;height:clamp(590px,82vh,900px);border:1px solid var(--line);border-radius:12px;margin-top:16px;background:white";
      frame.src = url;
      root.querySelector("section").append(frame);
      const instruction = document.createElement("span");
      instruction.textContent = "Choose Play inside the Slumbot table.";
      instruction.setAttribute("role", "status");
      launch.replaceWith(instruction);
      frame.focus();
    }, { once: true });
  }

  window.HostedOpponent = { mount };
})();
