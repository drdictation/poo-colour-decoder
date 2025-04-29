// static/js/decoder.js
console.log("▶ Decoder script v4 loaded");

(function () {
  /* ---------- DOM ---------- */
  const fileInput = document.getElementById("file"),
        canvas    = document.getElementById("can"),
        ctx       = canvas.getContext("2d"),
        resultDiv = document.getElementById("result"),
        shareBtn  = document.getElementById("shareBtn");

  /* ---------- Colour targets ---------- */
  const idealBrown  = { h: 30,  s: 0.60, l: 0.35 };
  const idealGreen  = { h: 90,  s: 0.50, l: 0.40 };
  const idealYellow = { h: 60,  s: 0.70, l: 0.50 };
  const brownRange  = { hMin: 15, hMax: 45, sMin: 0.30, sMax: 0.60, lMin: 0.20, lMax: 0.50 };

  /* ---------- Fun text ---------- */
  const weirdLines = [
    "Hmm… that hue looks suspiciously non-poo! 😅",
    "Either your diet is cosmic, or that’s not stool at all!",
    "Purple poo? Picasso would approve 🎨"
  ];

  const dietTips = {
    green : "Try more probiotics (yogurt, kefir) and reduce excess leafy greens.",
    yellow: "Cut back on greasy foods and heavy dairy; add lean proteins."
  };

  /* ---------- Helpers ---------- */
  const rgbToHex = (r,g,b) => "#" + [r,g,b].map(x => x.toString(16).padStart(2,"0")).join("");

  function rgb2hsl(r,g,b){
    r/=255; g/=255; b/=255;
    const max=Math.max(r,g,b), min=Math.min(r,g,b), d=max-min;
    let h=0,s=0,l=(max+min)/2;
    if(d){
      s=l>0.5?d/(2-max-min):d/(max+min);
      switch(max){
        case r: h=(g-b)/d+(g<b?6:0); break;
        case g: h=(b-r)/d+2; break;
        case b: h=(r-g)/d+4; break;
      }
      h*=60;
    }
    return [h,s,l];
  }

  const closenessTo = (t,h,s,l) => {
    const dh=(h-t.h)/360, ds=s-t.s, dl=l-t.l;
    return Math.max(0, (1-Math.sqrt(dh*dh+ds*ds+dl*dl)/0.5)*100).toFixed(2);
  };

  const classify = h => (
    h<20||h>340 ? {key:"red",   title:"Red / Maroon"} :
    h<40        ? {key:"brown", title:"Normal Brown"} :
    h<75        ? {key:"yellow",title:"Yellow"} :
    h<150       ? {key:"green", title:"Green"} :
    h<260       ? {key:"black", title:"Black"} :
                  {key:"pale",  title:"Pale / Clay"}
  );

  const inNormal = (h,s,l) =>
    h>=brownRange.hMin && h<=brownRange.hMax &&
    s>=brownRange.sMin && s<=brownRange.sMax &&
    l>=brownRange.lMin && l<=brownRange.lMax;

  /* ---------- Image handler ---------- */
  fileInput.addEventListener("change", e => {
    const file = e.target.files[0];
    if(!file) return;

    resultDiv.innerHTML="<p>Analysing…</p>";

    const img=new Image();
    img.onload=()=>{
      canvas.width=img.naturalWidth;
      canvas.height=img.naturalHeight;
      ctx.drawImage(img,0,0);

      /* --- sample centre pixel --- */
      const [r,g,b]=ctx.getImageData(canvas.width/2,canvas.height/2,1,1).data;
      const hex   = rgbToHex(r,g,b);
      const [h,s,l]=rgb2hsl(r,g,b);
      const cls   = classify(h);
      const {key,title}=cls;

      /* --- stats --- */
      const brownPct = closenessTo(idealBrown ,h,s,l);
      const greenPct = closenessTo(idealGreen ,h,s,l);
      const yellowPct= closenessTo(idealYellow,h,s,l);

      const redPct = ((r/(r+g+b||1))*100).toFixed(2);
      const variance = ((Math.max(r,g,b)-Math.min(r,g,b))/255*100).toFixed(2);

      /* --- warnings & jokes --- */
      const badge = inNormal(h,s,l)
        ? '<span class="badge badge-ok">✅ NORMAL</span>'
        : '<span class="badge badge-warn">⚠️ UNUSUAL</span>';

      const bloodWarning = (redPct>60 && key!=="red")
        ? `<p class="warning">⚠️ High red component (${redPct}%). Make sure this isn’t blood—consult a professional if unsure.</p>`
        : "";

      const funLine = !["red","brown","yellow","green","black","pale"].includes(key)
        ? `<p><strong>${weirdLines[Math.random()*weirdLines.length|0]}</strong></p>` : "";

      const tip = dietTips[key] ? `<h4>Diet Tip</h4><p>${dietTips[key]}</p>` : "";

      const encourage = inNormal(h,s,l)
        ? '<p class="try-again">🎉 Looking good—come back tomorrow to keep your streak!</p>'
        : '<p class="try-again">🔄 Aim for normal brown—try again after your next meal!</p>';

      /* --- get a random blurb --- */
      fetch("/blurbs.json").then(r=>r.json()).then(data=>{
        const pool = Array.isArray(data[key]) ? data[key] : [String(data[key]||"")];
        const blurb = pool[Math.random()*pool.length|0];
        const foods = data.foods[key]||{eat:[],avoid:[]};

        /* --- render output --- */
        resultDiv.innerHTML=`
          <div class="swatch" style="background:${hex}"></div>
          <h3>${title} ${badge}</h3>

          <div class="metric"><span>Brown match:</span> ${brownPct}%</div>
          <div class="metric"><span>Green match:</span> ${greenPct}%</div>
          <div class="metric"><span>Yellow match:</span> ${yellowPct}%</div>
          <div class="metric"><span>Red component:</span> ${redPct}%</div>
          <div class="metric"><span>Colour variance:</span> ${variance}%</div>

          ${bloodWarning}

          <p>${blurb}</p>
          ${tip}
          ${funLine}

          <p><strong>Eat:</strong> ${foods.eat.join(", ")||"—"}</p>
          <p><strong>Avoid:</strong> ${foods.avoid.join(", ")||"—"}</p>

          <p class="normal-range">
            Normal brown corridor: Hue ${brownRange.hMin}–${brownRange.hMax}°, 
            Sat ${brownRange.sMin*100}–${brownRange.sMax*100}%, 
            Light ${brownRange.lMin*100}–${brownRange.lMax*100}%.
          </p>

          ${encourage}
        `;

        /* --- enable Share button --- */
        shareBtn.style.display="inline-block";
        shareBtn.onclick=()=>{
          const txt=`My stool is ${title} (${brownPct}% brown)! Check yours: https://poopcolor.info`;
          navigator.clipboard.writeText(txt).then(()=>{
            shareBtn.textContent="Copied!";
            setTimeout(()=>shareBtn.textContent="Share score",1500);
          });
        };
      });
    };
    img.src=URL.createObjectURL(file);
  });
})();