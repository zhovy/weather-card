// ========== 全局状态 ==========
let currentCity = { name: "济南市", lat: 36.6512, lon: 117.1201, province: "山东" };
let mode = 'realtime';          // 'realtime' 或 'forecast'
let forecastDayIndex = 0;       // 当 mode='forecast' 时，当前显示的预报日期索引（0=今天，1=明天...）
let cachedDailyData = null;    // 缓存最近一次获取的 daily 数据
let latestSearchResults = [];   // 缓存最近一次搜索结果，供按钮和回车复用

// ========== 更新公历、农历、节日显示（头部）==========
function updateDateDisplay(date = new Date()) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const weekday = weekdays[date.getDay()];
    document.getElementById('solar-date').innerHTML = `${year}年${month}月${day}日 ${weekday}`;

    // 完整农历（含年份）
    document.getElementById('lunar-date').innerHTML = getLunarDate(date);

    // 节日：农历节日 + 公历节气
    const lunarFestival = typeof getLunarFestival === 'function' ? getLunarFestival(date) : '';
    const solarTerm = typeof getSolarTerm === 'function' ? getSolarTerm(date) : '';
    let festivalText = '';
    if (lunarFestival && solarTerm) {
        festivalText = `${lunarFestival} · ${solarTerm}`;
    } else if (lunarFestival) {
        festivalText = lunarFestival;
    } else if (solarTerm) {
        festivalText = solarTerm;
    }
    document.getElementById('festival-today').innerHTML = festivalText ? festivalText : '';
}

// ========== 渲染省份下拉框 ==========
function renderProvinceSelect() {
    const sel = document.getElementById('province-select');
    sel.innerHTML = '';
    Object.keys(CHINA_CITIES).sort().forEach(p => {
        const opt = document.createElement('option');
        opt.value = p;
        opt.textContent = p;
        if (p === currentCity.province) opt.selected = true;
        sel.appendChild(opt);
    });
}

// ========== 根据省份渲染城市下拉框 ==========
function renderCitySelect(province) {
    const sel = document.getElementById('city-select');
    sel.innerHTML = '';
    const cities = CHINA_CITIES[province];
    if (!cities) return;
    Object.keys(cities).sort().forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        if (province === currentCity.province && c === currentCity.name) opt.selected = true;
        sel.appendChild(opt);
    });
}

// ========== 切换到选中的城市（来自下拉框）并重置为实时模式 ==========
function switchToSelectedCity() {
    const province = document.getElementById('province-select').value;
    const city = document.getElementById('city-select').value;
    if (!province || !city) return;
    const latlon = CHINA_CITIES[province][city];
    if (!latlon) return;
    currentCity = { name: city, lat: latlon[0], lon: latlon[1], province: province };
    document.getElementById('city-name').textContent = city;
    mode = 'realtime';
    forecastDayIndex = 0;
    fetchWeatherAndUpdate();
}

// ========== 绑定选择器事件 ==========
function bindSelectors() {
    const provSel = document.getElementById('province-select');
    provSel.addEventListener('change', function() {
        renderCitySelect(this.value);
        const firstCity = Object.keys(CHINA_CITIES[this.value])[0];
        const latlon = CHINA_CITIES[this.value][firstCity];
        currentCity = { name: firstCity, lat: latlon[0], lon: latlon[1], province: this.value };
        document.getElementById('city-name').textContent = firstCity;
        mode = 'realtime';
        forecastDayIndex = 0;
        fetchWeatherAndUpdate();
    });
    document.getElementById('confirm-city').addEventListener('click', switchToSelectedCity);
}

// ========== 根据实时数据更新UI（实时模式）==========
function renderRealtimeUI(d) {
    const cur = d.current;
    const daily = d.daily;
    cachedDailyData = daily;

    const temp = cur.temperature_2m !== undefined ? formatOneDecimal(cur.temperature_2m) : '--';
    const high = daily?.temperature_2m_max?.[0] !== undefined ? Math.round(daily.temperature_2m_max[0]) : '--';
    const low = daily?.temperature_2m_min?.[0] !== undefined ? Math.round(daily.temperature_2m_min[0]) : '--';
    const hum = cur.relative_humidity_2m ?? '--';
    const wind = cur.wind_speed_10m !== undefined ? Math.round(cur.wind_speed_10m) : '--';
    const feel = cur.apparent_temperature !== undefined ? formatOneDecimal(cur.apparent_temperature) : '--';
    let uv = cur.uv_index ?? '--';
    const uvVal = (typeof uv === 'number') ? uv.toFixed(1) : uv;
    const uvLev = (typeof uv === 'number') ? getUvLevel(uv) : '--';
    const wcode = cur.weather_code ?? -1;
    const { icon, desc } = getWeatherInfo(wcode);
    const cloud = cur.cloud_cover ?? '--';
    const press = cur.pressure_msl !== undefined ? Math.round(cur.pressure_msl) : '--';
    let vis = cur.visibility !== undefined ? (cur.visibility / 1000).toFixed(1) : '--';
    const dew = cur.dewpoint_2m !== undefined ? formatOneDecimal(cur.dewpoint_2m) : '--';
    const precipToday = daily?.precipitation_probability_max?.[0] ?? '--';

    document.getElementById('current-temp').textContent = temp;
    document.getElementById('high-temp').textContent = high;
    document.getElementById('low-temp').textContent = low;
    document.getElementById('weather-icon').textContent = icon;
    document.getElementById('weather-desc').textContent = desc;
    document.getElementById('humidity-val').textContent = hum;
    document.getElementById('wind-val').textContent = wind;
    document.getElementById('feelslike-val').textContent = feel;
    document.getElementById('uv-val').textContent = uvVal;
    document.getElementById('uv-desc').textContent = uvLev;
    document.getElementById('precip-prob').textContent = precipToday;
    document.getElementById('cloud-val').textContent = cloud;
    document.getElementById('pressure-val').textContent = press;
    document.getElementById('visibility-val').textContent = vis;
    document.getElementById('dewpoint-val').textContent = dew;

    const advice = generateTodayAdvice(
        cur.temperature_2m ?? null,
        wcode,
        cur.relative_humidity_2m ?? null,
        cur.wind_speed_10m ?? null,
        cur.uv_index ?? null,
        cur.apparent_temperature ?? null,
        precipToday !== '--' ? precipToday : null,
        cloud !== '--' ? cloud : null
    );
    document.getElementById('today-advice-text').textContent = advice;

    // 恢复温度单位显示（清除预报模式添加的标注）
    const tempUnitEl = document.querySelector('.temp-unit');
    tempUnitEl.innerHTML = '°C';

    updateDateDisplay(new Date());
}

// ========== 根据预报数据更新UI（预报模式）==========
function renderForecastUI(dayIndex) {
    if (!cachedDailyData) return;
    const daily = cachedDailyData;
    if (!daily.time[dayIndex]) return;

    const dateStr = daily.time[dayIndex];
    const dateObj = new Date(dateStr + 'T12:00:00');
    const wcode = daily.weather_code[dayIndex];
    const { icon, desc } = getWeatherInfo(wcode);
    const maxTemp = Math.round(daily.temperature_2m_max[dayIndex]);
    const minTemp = Math.round(daily.temperature_2m_min[dayIndex]);
    const precipProb = daily.precipitation_probability_max?.[dayIndex] ?? '--';
    const uvMax = daily.uv_index_max?.[dayIndex] ?? null;
    const uvVal = uvMax !== null ? uvMax.toFixed(1) : '--';
    const uvLev = uvMax !== null ? getUvLevel(uvMax) : '--';
    const windMax = daily.wind_speed_10m_max?.[dayIndex] ?? null;
    const windVal = windMax !== null ? Math.round(windMax) : '--';

    document.getElementById('current-temp').textContent = maxTemp;
    const tempUnitEl = document.querySelector('.temp-unit');
    tempUnitEl.innerHTML = '°C<span style="font-size:0.8rem; margin-left:4px; color:#4a7a8c;">(最高)</span>';
    document.getElementById('high-temp').textContent = maxTemp;
    document.getElementById('low-temp').textContent = minTemp;
    document.getElementById('weather-icon').textContent = icon;
    document.getElementById('weather-desc').textContent = desc;

    document.getElementById('humidity-val').textContent = '--';
    document.getElementById('wind-val').textContent = windVal;
    document.getElementById('feelslike-val').textContent = '--';
    document.getElementById('uv-val').textContent = uvVal;
    document.getElementById('uv-desc').textContent = uvLev;
    document.getElementById('precip-prob').textContent = precipProb;
    document.getElementById('cloud-val').textContent = '--';
    document.getElementById('pressure-val').textContent = '--';
    document.getElementById('visibility-val').textContent = '--';
    document.getElementById('dewpoint-val').textContent = '--';

    const advice = generateDailyAdvice(
        wcode,
        maxTemp,
        minTemp,
        precipProb !== '--' ? precipProb : null,
        uvMax,
        windMax
    );
    document.getElementById('today-advice-text').textContent = '📆 ' + advice;

    updateDateDisplay(dateObj);
}

// ========== 渲染未来5天预报卡片（不含农历）==========
function renderForecastCards(daily) {
    const fc = document.getElementById('forecast-container');
    fc.innerHTML = '';

    if (!daily || !daily.time) return;

    for (let i = 1; i <= 5; i++) {
        if (daily.time[i]) {
            const dateStr = daily.time[i];
            const dateObj = new Date(dateStr + 'T12:00:00');
            const month = dateObj.getMonth() + 1;
            const day = dateObj.getDate();
            const solarDisplay = `${month}/${day}`;
            const weekday = getWeekday(dateStr);
            const cd = daily.weather_code[i];
            const { icon: fcIcon } = getWeatherInfo(cd);
            const max = Math.round(daily.temperature_2m_max[i]);
            const min = Math.round(daily.temperature_2m_min[i]);
            const pp = daily.precipitation_probability_max?.[i] ?? null;
            const ppt = pp !== null ? pp + '%' : '--%';
            const uvx = daily.uv_index_max?.[i] ?? null;
            const wx = daily.wind_speed_10m_max?.[i] ?? null;
            const tip = generateDailyAdvice(cd, max, min, pp, uvx, wx);

            const item = document.createElement('div');
            item.className = 'forecast-item';
            if (mode === 'forecast' && i === forecastDayIndex) {
                item.classList.add('active-forecast');
            }
            item.innerHTML = `
        <span class="forecast-weekday">${weekday}</span>
        <span class="forecast-date">${solarDisplay}</span>
        <span class="forecast-icon">${fcIcon}</span>
        <span class="forecast-temp">
          <span class="forecast-high">${max}°</span>
          <span class="forecast-low">${min}°</span>
        </span>
        <span class="forecast-precip"><span>🌧️</span> ${ppt}</span>
        <span class="forecast-advice" title="${tip}">${tip}</span>
      `;

            // 点击卡片切换到该天预报视图
            item.addEventListener('click', function(e) {
                e.stopPropagation();
                if (mode === 'forecast' && i === forecastDayIndex) {
                    fetchWeatherAndUpdate(); // 刷新数据
                } else {
                    mode = 'forecast';
                    forecastDayIndex = i;
                    if (cachedDailyData) {
                        renderForecastUI(i);
                        document.querySelectorAll('.forecast-item').forEach(el => el.classList.remove('active-forecast'));
                        this.classList.add('active-forecast');
                        document.getElementById('update-timestamp').innerHTML = `📌 预报 · 更新于 ${new Date().getHours().toString().padStart(2,'0')}:${new Date().getMinutes().toString().padStart(2,'0')}`;
                    } else {
                        fetchWeatherAndUpdate().then(() => {
                            document.querySelectorAll('.forecast-item').forEach(el => el.classList.remove('active-forecast'));
                            this.classList.add('active-forecast');
                        });
                    }
                }
            });

            fc.appendChild(item);
        }
    }
}

// ========== 获取天气数据并更新UI（主流程）==========
async function fetchWeatherAndUpdate() {
    try {
        const d = await fetchWeatherData(currentCity.lat, currentCity.lon);
        cachedDailyData = d.daily;

        if (mode === 'realtime') {
            renderRealtimeUI(d);
        } else if (mode === 'forecast') {
            if (!d.daily.time[forecastDayIndex]) {
                mode = 'realtime';
                forecastDayIndex = 0;
                renderRealtimeUI(d);
            } else {
                renderForecastUI(forecastDayIndex);
            }
        }

        renderForecastCards(d.daily);

        const n = new Date();
        document.getElementById('update-timestamp').innerHTML = `✅ 更新于 ${n.getHours().toString().padStart(2,'0')}:${n.getMinutes().toString().padStart(2,'0')}`;
        document.getElementById('time-text').textContent = formatTime();

    } catch (e) {
        console.error('❌ 天气获取失败:', e);
        document.getElementById('update-timestamp').innerHTML = `⚠️ 更新失败，${e.message || '请检查网络'}`;
        document.getElementById('time-text').textContent = formatTime();
    }
}

// ========== IP定位 + 最近城市匹配 ==========
// ---------- 使用支持 HTTPS 的 IP 定位服务（双备用）----------
async function getLocationByIP() {
    const apis = [
        'https://ipapi.co/json/',      // 免费版：每天1000次，无需key
        'https://ipinfo.io/json'      // 免费版：每天1000次，无需key
    ];

    for (const api of apis) {
        try {
            const response = await fetch(api);
            if (!response.ok) continue;

            const data = await response.json();

            // 处理 ipapi.co 返回的数据
            if (api.includes('ipapi.co')) {
                if (data.latitude && data.longitude) {
                    return {
                        lat: parseFloat(data.latitude),
                        lon: parseFloat(data.longitude),
                        city: data.city || '',
                        region: data.region || '',
                        country: data.country_name || ''
                    };
                }
            }

            // 处理 ipinfo.io 返回的数据
            if (api.includes('ipinfo.io')) {
                if (data.loc) {
                    const [lat, lon] = data.loc.split(',');
                    return {
                        lat: parseFloat(lat),
                        lon: parseFloat(lon),
                        city: data.city || '',
                        region: data.region || '',
                        country: data.country || ''
                    };
                }
            }
        } catch (e) {
            console.warn(`IP定位服务 ${api} 失败，尝试下一个...`, e);
            continue;
        }
    }

    console.warn('所有IP定位服务均失败，使用默认城市（济南）');
    return null;
}
function findNearestCity(lat, lon) {
    let minDist = Infinity;
    let nearestCity = null;
    let nearestProvince = null;
    for (const [province, cities] of Object.entries(CHINA_CITIES)) {
        for (const [cityName, coords] of Object.entries(cities)) {
            const [cityLat, cityLon] = coords;
            const dist = Math.pow(cityLat - lat, 2) + Math.pow(cityLon - lon, 2);
            if (dist < minDist) {
                minDist = dist;
                nearestCity = cityName;
                nearestProvince = province;
            }
        }
    }
    if (nearestCity) {
        return {
            name: nearestCity,
            province: nearestProvince,
            lat: CHINA_CITIES[nearestProvince][nearestCity][0],
            lon: CHINA_CITIES[nearestProvince][nearestCity][1]
        };
    }
    return null;
}
// ========== 2. 全球城市搜索（Nominatim 免费 API）=========
let searchTimeout = null;

function applySelectedCity(name, lat, lon) {
    currentCity = {
        name,
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        province: ''
    };
    document.getElementById('city-name').textContent = currentCity.name;
    mode = 'realtime';
    forecastDayIndex = 0;
    fetchWeatherAndUpdate();
}

function renderSearchSuggestions(results, suggestionsDiv, searchInput) {
    if (!results.length) {
        suggestionsDiv.style.display = 'none';
        return;
    }

    suggestionsDiv.innerHTML = '';
    results.forEach(item => {
        let displayName = item.display_name.split(',')[0];
        if (item.address?.country_code) {
            displayName += `, ${item.address.country_code.toUpperCase()}`;
        }

        const div = document.createElement('div');
        div.textContent = displayName;
        div.dataset.lat = item.lat;
        div.dataset.lon = item.lon;
        div.dataset.name = displayName;
        div.addEventListener('click', function() {
            applySelectedCity(this.dataset.name, this.dataset.lat, this.dataset.lon);
            suggestionsDiv.style.display = 'none';
            searchInput.value = this.dataset.name;
        });
        suggestionsDiv.appendChild(div);
    });
    suggestionsDiv.style.display = 'block';
}

async function searchCities(query) {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=8&addressdetails=1&featureType=city`;
    const response = await fetch(url, {
        headers: { 'User-Agent': 'WeatherApp/1.0' }
    });
    if (!response.ok) throw new Error('搜索失败');
    return response.json();
}

async function submitSearch(searchInput, suggestionsDiv) {
    const query = searchInput.value.trim();
    if (query.length < 2) {
        suggestionsDiv.style.display = 'none';
        return;
    }

    let results = latestSearchResults;
    if (!results.length || !results.some(item => item.display_name.includes(query))) {
        results = await searchCities(query);
    }

    if (!results.length) {
        suggestionsDiv.style.display = 'none';
        return;
    }

    const best = results[0];
    let name = best.display_name.split(',')[0];
    if (best.address?.country_code) {
        name += `, ${best.address.country_code.toUpperCase()}`;
    }
    applySelectedCity(name, best.lat, best.lon);
    suggestionsDiv.style.display = 'none';
    searchInput.value = name;
}

function initCitySearch() {
    const searchInput = document.getElementById('city-search');
    const suggestionsDiv = document.getElementById('search-suggestions');
    const confirmBtn = document.getElementById('confirm-city');

    searchInput.addEventListener('input', function() {
        const query = this.value.trim();
        if (query.length < 2) {
            suggestionsDiv.style.display = 'none';
            return;
        }

        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(async () => {
            try {
                latestSearchResults = await searchCities(query);
                renderSearchSuggestions(latestSearchResults, suggestionsDiv, searchInput);
            } catch (e) {
                console.error('城市搜索出错:', e);
                suggestionsDiv.style.display = 'none';
            }
        }, 300); // 防抖
    });

    searchInput.addEventListener('keydown', async function(e) {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        try {
            await submitSearch(searchInput, suggestionsDiv);
        } catch (err) {
            console.error('回车查询失败:', err);
        }
    });

    confirmBtn.addEventListener('click', async function() {
        try {
            await submitSearch(searchInput, suggestionsDiv);
        } catch (err) {
            console.error('按钮查询失败:', err);
        }
    });

    // 点击页面其他区域隐藏建议框
    document.addEventListener('click', function(e) {
        if (!e.target.closest('#city-search') && !e.target.closest('.search-suggestions')) {
            suggestionsDiv.style.display = 'none';
        }
    });
}

function getLocationFromBrowser() {
    if (!navigator.geolocation) return Promise.resolve(null);

    return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                resolve({
                    lat: pos.coords.latitude,
                    lon: pos.coords.longitude,
                    source: 'gps'
                });
            },
            () => resolve(null),
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 }
        );
    });
}
// ========== 1. IP定位：不再匹配中国城市 ==========
async function initLocation() {
    const browserLoc = await getLocationFromBrowser();
    const ipLoc = browserLoc || await getLocationByIP();
    if (ipLoc) {
        // 直接使用定位返回的经纬度和城市名
        let cityName = ipLoc.city || '当前位置';
        if (ipLoc.country) cityName += `, ${ipLoc.country}`;

        currentCity = {
            name: cityName,
            lat: ipLoc.lat,
            lon: ipLoc.lon,
            province: ''  // 国外城市无省份，国内城市会在下面特殊处理
        };

        // 尝试在中国城市数据库中查找该城市（用于同步下拉框）
        let matched = false;
        if (ipLoc.country === 'CN' || ipLoc.country === '中国') {
            for (const [province, cities] of Object.entries(CHINA_CITIES)) {
                for (const [city, coords] of Object.entries(cities)) {
                    if (city.includes(ipLoc.city) || ipLoc.city.includes(city)) {
                        currentCity = {
                            name: city,
                            lat: coords[0],
                            lon: coords[1],
                            province: province
                        };
                        matched = true;
                        break;
                    }
                }
                if (matched) break;
            }
        }

        document.getElementById('city-name').textContent = currentCity.name;
    }
    // 定位失败时保留默认城市（济南）
}

// ========== 3. 在 init() 中调用搜索框初始化 ==========
async function init() {
    // 初始化定位
    await initLocation();

    // 渲染中国城市下拉树（完全保留）
    // renderProvinceSelect();
    // renderCitySelect(currentCity.province);
    // bindSelectors();

    // 初始化城市搜索框
    initCitySearch();

    // 更新界面
    document.getElementById('city-name').textContent = currentCity.name;
    updateDateDisplay();
    fetchWeatherAndUpdate();

    // 自动更新（仅实时模式）
    setInterval(() => {
        if (mode === 'realtime') {
            fetchWeatherAndUpdate();
        }
        document.getElementById('time-text').textContent = formatTime();
        if (mode === 'realtime') {
            updateDateDisplay();
        }
    }, 60000);
}

window.addEventListener('DOMContentLoaded', init);
