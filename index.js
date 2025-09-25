function convertTemp(v, from, to){
      if(from===to) return v;
      let c;
      if(from==='C') c = v;
      if(from==='F') c = (v - 32) * 5/9;
      if(from==='K') c = v - 273.15;
      // to target
      if(to==='C') return c;
      if(to==='F') return c * 9/5 + 32;
      if(to==='K') return c + 273.15;
    }

    const lengthToMeters = {
      m:1, km:1000, cm:0.01, mm:0.001, mi:1609.344, ft:0.3048, in:0.0254
    };

    function convertLength(v, from, to){
      if(from===to) return v;
      const inMeters = v * (lengthToMeters[from] || 1);
      return inMeters / (lengthToMeters[to] || 1);
    }

    const weightToKg = {kg:1, g:0.001, lb:0.45359237, oz:0.028349523125};
    function convertWeight(v, from, to){
      if(from===to) return v;
      const inKg = v * (weightToKg[from] || 1);
      return inKg / (weightToKg[to] || 1);
    }

    const API_KEY = 'process.env.API_KEY'; // get your free key from https://apilayer.com/marketplace/exchangerates_data-api
    const useApiLayer = Boolean(API_KEY && API_KEY.trim());

    const exchangerateHostBase = 'https://api.exchangerate.host';
    const apilayerBase = 'https://api.apilayer.com/exchangerates_data';

    const commonCurrencies = ['USD','EUR','GBP','JPY','AUD','CAD','CHF','CNY','KES','RWF'];

    function populateCurrencySelects(symbols){
      const from = document.getElementById('cur-from');
      const to = document.getElementById('cur-to');
      from.innerHTML = '';
      to.innerHTML = '';
      const list = symbols && symbols.length? symbols : commonCurrencies;
      list.forEach(s => {
        const o1 = document.createElement('option'); o1.value = s; o1.textContent = s; from.appendChild(o1);
        const o2 = document.createElement('option'); o2.value = s; o2.textContent = s; to.appendChild(o2);
      });
      from.value='USD'; to.value='RWF';
    }

    async function fetchWithProvider(path){
      const base = useApiLayer ? apilayerBase : exchangerateHostBase;
      const url = base + path;
      const opts = {};
      if(useApiLayer){
        opts.headers = { 'apikey': API_KEY };
      }
      const resp = await fetch(url, opts);
      if(!resp.ok) throw new Error('API error: '+resp.status+' '+resp.statusText);
      return resp.json();
    }

    async function loadSymbolsAndRates(){
      try{
        const j = await fetchWithProvider('/symbols');
        const symbolsObj = j && (j.symbols || j.symbols);
        if(symbolsObj){
          const keys = Object.keys(symbolsObj);
          populateCurrencySelects(keys.slice(0,60));
          document.getElementById('cur-status').textContent = useApiLayer ? 'Rates: live • provider: apilayer' : 'Rates: live • provider: exchangerate.host';
        } else {
          populateCurrencySelects(null);
        }
      }catch(e){
        console.warn('Could not fetch symbols, falling back to curated list', e);
        populateCurrencySelects(null);
        document.getElementById('cur-status').textContent = 'Rates: offline (fallback)';
      }
    }

    async function convertCurrency(amount, from, to){
      const query = `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&amount=${encodeURIComponent(amount)}`;
      const data = await fetchWithProvider('/convert' + query);
      return data;
    }

    function t(id){return document.getElementById(id)}

    function updateTemp(){
      const v = parseFloat(t('temp-value').value)||0;
      const from = t('temp-from').value; const to = t('temp-to').value;
      const out = convertTemp(v, from, to);
      t('temp-result').textContent = `${v} ${from} → ${Number(out).toFixed(4)} ${to}`;
    }

    function updateLen(){
      const v = parseFloat(t('len-value').value)||0;
      const from = t('len-from').value; const to = t('len-to').value;
      const out = convertLength(v, from, to);
      t('len-result').textContent = `${v} ${from} → ${Number(out).toFixed(6)} ${to}`;
    }

    function updateWt(){
      const v = parseFloat(t('wt-value').value)||0;
      const from = t('wt-from').value; const to = t('wt-to').value;
      const out = convertWeight(v, from, to);
      t('wt-result').textContent = `${v} ${from} → ${Number(out).toFixed(6)} ${to}`;
    }

    async function onConvertCurrency(){
      const amount = parseFloat(t('cur-value').value)||0;
      const from = t('cur-from').value; const to = t('cur-to').value;
      t('cur-status').textContent = 'Converting...';
      try{
        const res = await convertCurrency(amount, from, to);
        // normalize
        const result = res.result ?? res.conversion ?? null;
        const rate = (res.info && res.info.rate) ? res.info.rate : (result ? result/amount : null);
        const date = res.date || res.timestamp || '';
        t('cur-result').textContent = result!==null ? `${amount} ${from} → ${Number(result).toFixed(4)} ${to} (rate ${Number(rate).toFixed(6)})` : 'Conversion failed';
        t('cur-status').textContent = `Last update: ${date} • provider: ${useApiLayer ? 'apilayer' : 'exchangerate.host'}`;
      }catch(e){
        t('cur-status').textContent = 'Error fetching rates';
        t('cur-result').textContent = '—';
        console.error(e);
      }
    }
    ['temp-value','temp-from','temp-to'].forEach(id=>t(id).addEventListener('input', updateTemp));
    ['len-value','len-from','len-to'].forEach(id=>t(id).addEventListener('input', updateLen));
    ['wt-value','wt-from','wt-to'].forEach(id=>t(id).addEventListener('input', updateWt));
    t('convert-currency').addEventListener('click', onConvertCurrency);
    updateTemp(); updateLen(); updateWt(); loadSymbolsAndRates();