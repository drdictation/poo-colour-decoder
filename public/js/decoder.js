// static/js/decoder.js
console.log("▶ Decoder script v3 loaded");

(function() {
  // DOM elements
  const fileInput  = document.getElementById('file'),
        canvas     = document.getElementById('can'),
        ctx        = canvas.getContext('2d'),
        resultDiv  = document.getElementById('result');

  // “Normal brown” target
  const idealBrown  = { h: 30, s: 0.6, l: 0.35 };
  const brownRange  = { hMin:15, hMax:45, sMin:0.30, sMax:0.60, lMin:0.20, lMax:0.50 };
  // “Ideal green” & “ideal yellow” for extra metrics
  const idealGreen  = { h:  90, s: 0.50, l: 0.40 };
  const idealYellow = { h:  60, s: 0.70, l: 0.50 };

  // Fun “not‐poo” lines
  const weirdLines = [
    "Hmm… that hue looks suspiciously non-poo! 😅",
    "Either your diet is cosmic, or that’s not stool at all!",
    "Purple poo? Picasso would approve 🎨"
  ];

  // Dietary tips for green / yellow
  const dietTips = {
    green:  "Try more probiotics (yogurt, kefir) and reduce excess leafy greens if your stool stays green.",
    yellow: "Cut back on greasy/fried foods and heavy dairy; add more cooked vegetables and lean proteins."
  };

  // Helper: RGB → HEX
  function rgbToHex(r,g,b) {
    return "#" + [r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');
  }

  // Helper: RGB → HSL
  function rgb2hsl(r,g,b) {
    r/=255; g/=255; b/=255;
    const max = Math.max(r,g,b), min = Math.min(r,g,b), d = max-min;
    let h=0,s=0,l=(max+min)/2;
    if (d) {
      s = l>0.5 ? d/(2-max-min) : d/(max+min);
      switch(max){
        case r: h=(g-b)/d + (g<b?6:0); break;
        case g: h=(b-r)/d + 2; break;
        case b: h=(r-g)/d + 4; break;
      }
      h *= 60;
    }
    return [h,s,l];
  }

  // Euclidean‐in‐HSL closeness, normalized to 0–100%
  function closenessTo(target, h,s,l) {
    const dh = (h - target.h)/360,
          ds = (s - target.s),
          dl = (l - target.l),
          dist = Math.sqrt(dh*dh + ds*ds + dl*dl);
    return Math.max(0, Math.round((1 - dist/0.5)*10000)/100); // two decimals
  }

  // Classify by hue
  function classify(h) {
    if (h<20||h>340) return { key:'red',   title:'Red / Maroon' };
    if (h<40)        return { key:'brown', title:'Normal Brown' };
    if (h<75)        return { key:'yellow',title:'Yellow' };
    if (h<150)       return { key:'green', title:'Green' };
    if (h<260)       return { key:'black', title:'Black' };
    return { key:'pale',  title:'Pale / Clay' };
  }

  // Check “normal corridor”
  function inNormal(h,s,l) {
    return h>=brownRange.hMin && h<=brownRange.hMax
        && s>=brownRange.sMin && s<=brownRange.sMax
        && l>=brownRange.lMin && l<=brownRange.lMax;
  }

  // Compute red%, variance
  function computeStats(r,g,b) {
    const total = r + g + b || 1;
    const redPct   = ((r/total)*100).toFixed(2);
    const vals     = [r,g,b];
    const variance = ((Math.max(...vals) - Math.min(...vals))/255*100).toFixed(2);
    return { redPct, variance };
  }

  // Main handler
  fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    resultDiv.innerHTML = ''; // clear

    const img = new Image();
    img.onload = () => {
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);

      const [r,g,b] = ctx.getImageData(
        Math.floor(canvas.width/2),
        Math.floor(canvas.height/2),
        1,1
      ).data;

      // conversions & stats
      const hex       = rgbToHex(r,g,b),
            [h,s,l]   = rgb2hsl(r,g,b),
            cls        = classify(h),
            normal     = inNormal(h,s,l),
            { redPct, variance } = computeStats(r,g,b),
            badge      = normal
                       ? '<span class="badge badge-ok">✅ NORMAL</span>'
                       : '<span class="badge badge-warn">⚠️ UNUSUAL</span>';

      // blood warning
      let bloodWarning = '';
      if (redPct > 60 && cls.key !== 'red') {
        bloodWarning = `<p class="warning">⚠️ That looks very red (${redPct}%). Make sure it isn’t blood—if unsure, consult a professional.</p>`;
      }

      // fun odd‐colour
      const funLine = !['red','brown','yellow','green','black','pale'].includes(cls.key)
                    ? `<p><strong>${weirdLines[Math.floor(Math.random()*weirdLines.length)]}</strong></p>`
                    : '';

      // diet tip
      const tip = (cls.key === 'green' || cls.key === 'yellow')
                ? `<h4>Diet Tip</h4><p>${dietTips[cls.key]}</p>`
                : '';

      // compute closeness metrics
      const brownPct  = closenessTo(idealBrown,  h,s,l),
            greenPct  = closenessTo(idealGreen,  h,s,l),
            yellowPct = closenessTo(idealYellow, h,s,l);

      // encouragement message
      const encourage = normal
        ? `<p class="try-again">🎉 All good—come back tomorrow to track your brown-ness!</p>`
        : `<p class="try-again">🔄 Not quite normal—try again tomorrow and see if you can hit “normal”!</p>`;

      // render
      resultDiv.innerHTML = `
        <div class="swatch" style="background:${hex}"></div>
        <h3>${cls.title} ${badge}</h3>

        <div class="metric"><span>Brown Closeness:</span> ${brownPct}%</div>
        <div class="metric"><span>Green Closeness:</span> ${greenPct}%</div>
        <div class="metric"><span>Yellow Closeness:</span> ${yellowPct}%</div>
        <div class="metric"><span>Red Component:</span> ${redPct}%</div>
        <div class="metric"><span>Colour Variation:</span> ${variance}%</div>

        ${bloodWarning}
        <p>${cls.key && cls.title ? cls.title + ' indicates typical ' + cls.title.toLowerCase() + ' tones.' : ''}</p>
        ${tip}
        ${funLine}
        <p class="normal-range">
          <strong>Normal Brown Corridor:</strong>
          Hue ${brownRange.hMin}–${brownRange.hMax}°, 
          Sat ${Math.round(brownRange.sMin*100)}–${Math.round(brownRange.sMax*100)}%, 
          Light ${Math.round(brownRange.lMin*100)}–${Math.round(brownRange.lMax*100)}%
        </p>
        ${encourage}
      `;
    };

    img.src = URL.createObjectURL(file);
  });
})();