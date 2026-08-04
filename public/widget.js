(function () {
  // -----------------------------------------------------------------------------
  // Kooprapport-widget voor partnerwebsites (makelaars/hypotheekadviseurs).
  // Embed via: <script src="https://kooprapport.nl/widget.js" data-kantoor="<slug>" async></script>
  //
  // BEWUST GEEN inline waardeberekening in dit script: dat zou een publiek,
  // ongeauthenticeerd endpoint vereisen dat per bezoek een (kostenveroorzakende)
  // Altum-aanroep doet -- een makkelijk misbruikt gratis-geld-endpoint. In
  // plaats daarvan toont dit script een kleine, gebrande knop die doorlinkt
  // naar de Kooprapport-homepage met een ref-parameter, zodat bezoekers zelf
  // via de bestaande, al beveiligde adreszoekflow een gratis preview opvragen.
  // Eenvoudiger en veiliger v1; een volledig ingebedde live-calculator is een
  // aparte, grotere vervolgstap (eigen publieke API + eigen rate limiting).
  // -----------------------------------------------------------------------------
  var script = document.currentScript;
  var kantoor = (script && script.getAttribute("data-kantoor")) || "onbekend";
  var basisUrl = (script && script.src.replace(/\/widget\.js.*$/, "")) || "https://kooprapport.nl";

  var link = document.createElement("a");
  link.href = basisUrl + "/?via=" + encodeURIComponent(kantoor) + "&utm_source=widget&utm_medium=partner";
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = "Bereken de waarde van uw droomhuis";
  link.setAttribute(
    "style",
    [
      "display:inline-flex",
      "align-items:center",
      "gap:8px",
      "background:#4F46E5",
      "color:#ffffff",
      "font-family:Inter,Arial,sans-serif",
      "font-size:14px",
      "font-weight:600",
      "padding:12px 20px",
      "border-radius:999px",
      "text-decoration:none",
      "box-shadow:0 6px 16px rgba(79,70,229,0.25)",
    ].join(";")
  );

  var container = document.getElementById("kooprapport-widget") || script.parentElement;
  if (container) container.appendChild(link);
})();
