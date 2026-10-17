/**
 * Panel de coaching: por qué importa, árbol de errores, screening, comparador.
 */
const $ = (sel, root = document) => root.querySelector(sel);

export class InsightPanel {
  constructor(rootEl, { guide, coaching, onSelectExercise, onGoToStep, onCompare }) {
    this.root = rootEl;
    this.guide = guide;
    this.coaching = coaching;
    this.onSelectExercise = onSelectExercise;
    this.onGoToStep = onGoToStep;
    this.onCompare = onCompare;
    this.exercise = null;
    this.stepIdx = 0;
    this.tab = 'insight';
    this._selectedError = null;
    this._screeningAnswers = {};
    this._buildShell();
  }

  _buildShell() {
    this.root.innerHTML = `
      <div class="insight-head">
        <h3>Coaching</h3>
        <nav class="insight-tabs" role="tablist">
          <button type="button" data-tab="insight" class="active">Insight</button>
          <button type="button" data-tab="errors">Errores</button>
          <button type="button" data-tab="screen">¿Para mí?</button>
          <button type="button" data-tab="compare">Comparar</button>
        </nav>
      </div>
      <div class="insight-body" id="insightBody"></div>
      <div class="insight-foot" id="insightFoot"></div>`;
    this.root.querySelectorAll('.insight-tabs button').forEach((b) => {
      b.addEventListener('click', () => {
        this.tab = b.dataset.tab;
        this.root.querySelectorAll('.insight-tabs button').forEach((x) => x.classList.toggle('active', x === b));
        this.render();
      });
    });
    this.body = $('#insightBody', this.root);
    this.foot = $('#insightFoot', this.root);
  }

  setExercise(ex, stepIdx = 0) {
    this.exercise = ex;
    this.stepIdx = stepIdx;
    this._selectedError = null;
    this._screeningAnswers = {};
    this.render();
  }

  setStep(stepIdx) {
    this.stepIdx = stepIdx;
    if (this.tab === 'insight') this.render();
  }

  _coach() {
    return this.coaching?.exercises?.[this.exercise?.id] || {};
  }

  _exById(id) {
    return this.guide.exercises.find((e) => e.id === id);
  }

  render() {
    if (!this.exercise) {
      this.body.innerHTML = '<p class="insight-empty">Elige un ejercicio para ver coaching avanzado.</p>';
      this.foot.innerHTML = '';
      return;
    }
    const fn = {
      insight: () => this._renderInsight(),
      errors: () => this._renderErrors(),
      screen: () => this._renderScreening(),
      compare: () => this._renderCompare(),
    }[this.tab];
    this.body.innerHTML = '';
    fn?.();
    this._renderFoot();
  }

  _renderFoot() {
    const c = this._coach();
    const live = c.live_id;
    const params = new URLSearchParams({
      ex: live || '',
      guide: this.exercise.id,
      step: String(this.stepIdx),
    });
    const canLive = c.live_available && live;
    this.foot.innerHTML = `
      <a class="btn-live ${canLive ? '' : 'disabled'}" href="${canLive ? `/live?${params}` : '#'}"
         ${canLive ? '' : 'aria-disabled="true"'}>
        ${canLive ? '▶ Probar mi técnica' : 'Cámara IA: pronto'}
      </a>
      ${canLive ? `<p class="live-hint">${c.watch_intro || ''}</p>` : ''}`;
    const btn = $('.btn-live', this.foot);
    if (!canLive) {
      btn?.addEventListener('click', (e) => e.preventDefault());
    } else {
      try {
        sessionStorage.setItem('ws_guide_ctx', JSON.stringify({
          guideId: this.exercise.id,
          guideName: this.exercise.name,
          step: this.stepIdx,
          watch: c.watch_metrics,
          watchIntro: c.watch_intro,
        }));
      } catch (_) { /* ignore */ }
    }
  }

  _renderInsight() {
    const c = this._coach();
    const step = this._coach().step_insights?.[String(this.stepIdx)] || {};
    const ex = this.exercise;

    let html = '';
    if (c.anthropometry) {
      html += `<section class="insight-block"><h4>Contexto corporal</h4><p>${c.anthropometry}</p></section>`;
    }
    if (c.watch_metrics?.length) {
      html += `<section class="insight-block"><h4>Qué mide la cámara</h4>
        <ul class="metric-chips">${c.watch_metrics.map((m) => `<li>${m}</li>`).join('')}</ul>
        <p class="muted">${c.watch_intro}</p></section>`;
    }
    if (step.coaching) {
      html += `<section class="insight-block"><h4>Fase actual</h4><p>${step.coaching}</p></section>`;
    }
    const angles = step.angles || {};
    const stepData = ex.steps?.[this.stepIdx];
    for (const a of stepData?.angles || []) {
      const ins = angles[a.label] || {};
      html += `<section class="insight-card">
        <span class="insight-label">${a.label}</span>
        <strong class="insight-range">${a.range}</strong>
        ${a.note ? `<em>${a.note}</em>` : ''}
        ${ins.why ? `<p class="why"><b>Por qué importa:</b> ${ins.why}</p>` : ''}
        ${ins.good_sign ? `<p class="good"><b>Señal de que vas bien:</b> ${ins.good_sign}</p>` : ''}
      </section>`;
    }
    if (!html) {
      html = `<section class="insight-block"><p>${ex.summary || 'Reproduce las fases con ▶ y lee las etiquetas sobre el modelo.'}</p></section>`;
    }
    this.body.innerHTML = html;
  }

  _renderErrors() {
    const c = this._coach();
    const trees = c.error_trees || {};
    const keys = Object.keys(trees);
    if (!keys.length) {
      this.body.innerHTML = '<p class="insight-empty">Sin errores catalogados para este ejercicio.</p>';
      return;
    }
    let html = '<p class="muted">Toca un error para ver causas, correcciones y variante.</p><ul class="error-list">';
    keys.forEach((k, i) => {
      html += `<li><button type="button" class="error-btn ${this._selectedError === k ? 'active' : ''}" data-err-i="${i}">${this._esc(k)}</button></li>`;
    });
    html += '</ul>';
    if (this._selectedError && trees[this._selectedError]) {
      const t = trees[this._selectedError];
      html += `<div class="error-detail">
        <h4>${this._esc(this._selectedError)}</h4>
        <p class="sub">Causas probables</p><ul>${t.causes.map((x) => `<li>${x}</li>`).join('')}</ul>
        <p class="sub">Correcciones (en orden)</p><ol>${t.fixes.map((x) => `<li>${x}</li>`).join('')}</ol>`;
      if (t.alt_exercise) {
        const alt = this._exById(t.alt_exercise);
        html += `<button type="button" class="link-btn" data-alt="${t.alt_exercise}">Ver variante: ${alt?.name || t.alt_exercise} →</button>`;
      }
      html += `<button type="button" class="link-btn subtle" data-goto-step="1">Ver fase crítica en 3D</button></div>`;
    }
    this.body.innerHTML = html;
    this.body.querySelectorAll('.error-btn').forEach((b) => {
      b.addEventListener('click', () => {
        this._selectedError = keys[+b.dataset.errI];
        this._renderErrors();
      });
    });
    $('.link-btn[data-alt]', this.body)?.addEventListener('click', (e) => {
      this.onSelectExercise?.(e.target.dataset.alt);
    });
    $('.link-btn[data-goto-step]', this.body)?.addEventListener('click', () => {
      this.onGoToStep?.(1);
      this.tab = 'insight';
      this.root.querySelector('[data-tab="insight"]')?.classList.add('active');
      this.root.querySelector('[data-tab="errors"]')?.classList.remove('active');
      this.render();
    });
  }

  _renderScreening() {
    const c = this._coach();
    const qs = c.screening || [];
    if (!qs.length) {
      this.body.innerHTML = '<p class="insight-empty">Sin cuestionario para este ejercicio.</p>';
      return;
    }
    let html = '<p class="muted">Responde con honestidad — esto no sustituye valoración médica.</p>';
    for (const q of qs) {
      const ans = this._screeningAnswers[q.id];
      html += `<div class="screen-q" data-qid="${q.id}">
        <p>${q.q}</p>
        <div class="screen-btns">
          <button type="button" data-ans="yes" class="${ans === 'yes' ? 'on' : ''}">Sí</button>
          <button type="button" data-ans="no" class="${ans === 'no' ? 'on' : ''}">No</button>
        </div></div>`;
    }
    const verdictEl = document.createElement('div');
    this.body.innerHTML = html;
    this.body.appendChild(verdictEl);
    this.body.querySelectorAll('.screen-q button').forEach((b) => {
      b.addEventListener('click', () => {
        const qid = b.closest('.screen-q').dataset.qid;
        this._screeningAnswers[qid] = b.dataset.ans;
        this._renderScreening();
      });
    });
    verdictEl.id = 'screenVerdict';
    verdictEl.innerHTML = this._screeningVerdict(qs);
    verdictEl.querySelectorAll('[data-alt]').forEach((b) => {
      b.addEventListener('click', () => this.onSelectExercise?.(b.dataset.alt));
    });
  }

  _screeningVerdict(qs) {
    const yesFlags = qs.filter((q) => this._screeningAnswers[q.id] === 'yes');
    if (!Object.keys(this._screeningAnswers).length) return '';
    if (!yesFlags.length) {
      return `<div class="verdict ok"><strong>Encaja bien para empezar</strong><p>No marcaste señales de alerta. Progresa con las fases 3D y prueba la cámara si está disponible.</p></div>`;
    }
    const avoid = yesFlags.find((q) => q.if_yes === 'avoid');
    const caution = yesFlags.find((q) => q.if_yes === 'caution');
    const variant = yesFlags.find((q) => q.if_yes === 'ok_variant');
    const pick = avoid || caution || variant || yesFlags[0];
    const cls = pick.if_yes === 'avoid' ? 'bad' : pick.if_yes === 'ok_variant' ? 'info' : 'warn';
    let alt = '';
    if (pick.alt) {
      const ex = this._exById(pick.alt);
      alt = `<button type="button" class="link-btn" data-alt="${pick.alt}">Alternativa: ${pick.alt_label || ex?.name || pick.alt}</button>`;
    }
    return `<div class="verdict ${cls}"><strong>${pick.if_yes === 'avoid' ? 'Precaución alta' : pick.if_yes === 'ok_variant' ? 'Variación normal' : 'Ajusta el ejercicio'}</strong>
      <p>${pick.msg}</p>${alt}</div>`;
  }

  _renderCompare() {
    const c = this._coach();
    const ids = c.comparison_ids || [];
    const all = this.coaching.comparisons || [];
    const mine = all.filter((x) => ids.includes(x.id));
    let html = '<p class="muted">Comparaciones biomecánicas con este ejercicio.</p>';
    if (!mine.length) {
      html += `<div class="compare-pick">
        <label>Ejercicio A</label>
        <select id="cmpA">${this._exOptions(this.exercise.id)}</select>
        <label>Ejercicio B</label>
        <select id="cmpB">${this._exOptions('hack_squat')}</select>
        <button type="button" class="link-btn" id="cmpGo">Comparar en 3D</button></div>`;
      this.body.innerHTML = html;
      $('#cmpGo', this.body)?.addEventListener('click', () => {
        const a = $('#cmpA', this.body).value;
        const b = $('#cmpB', this.body).value;
        this.onCompare?.(a, b);
      });
      return;
    }
    for (const cmp of mine) {
      const otherId = cmp.a === this.exercise.id ? cmp.b : cmp.a;
      const other = this._exById(otherId);
      html += `<article class="compare-card">
        <h4>${cmp.title}</h4>
        <p class="joint">${cmp.joint_focus}</p>
        <p>${cmp.insight}</p>
        <button type="button" class="link-btn" data-cmp-a="${cmp.a}" data-cmp-b="${cmp.b}">Ver ${this.exercise.name} vs ${other?.name || otherId} en 3D</button>
      </article>`;
    }
    this.body.innerHTML = html;
    this.body.querySelectorAll('[data-cmp-a]').forEach((b) => {
      b.addEventListener('click', () => {
        this.onCompare?.(b.dataset.cmpA, b.dataset.cmpB);
      });
    });
  }

  _exOptions(selected) {
    return this.guide.exercises.map((e) =>
      `<option value="${e.id}" ${e.id === selected ? 'selected' : ''}>${e.name}</option>`,
    ).join('');
  }

  _esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }
}
