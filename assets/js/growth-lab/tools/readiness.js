import { h, icon } from '../../components.js?v=1.0.47';
import { readinessBand, readinessScore } from '../calc.js?v=1.0.47';
import { clearState, loadState, saveState } from '../state.js?v=1.0.47';
import { barChart, copyButton, nextId, notice, sectionHeading } from '../ui.js?v=1.0.47';

const TOOL = 'readiness';

const BAND_TEXT = {
  Scalable: 'Your process has the structure to scale. Focus on the few remaining gaps and on measuring what works.',
  Structured: 'The foundations are in place. Tightening the weaker areas will make results more predictable.',
  Developing: 'Some good habits exist, but key parts of the process depend on effort rather than a system.',
  'Early stage': 'Business development is mostly ad hoc today. A few basic systems will make the biggest difference.',
};

export function mount({ lab, openTool }) {
  const { questions, categories, disclaimer } = lab.readiness;
  const state = loadState(TOOL, { answers: {}, step: 0, done: false });
  const root = h('div', { class: 'lab-tool lab-assess' });
  const status = h('p', { class: 'sr-only', role: 'status' });

  const categoryLabel = (id) => categories.find((category) => category.id === id)?.label ?? id;
  const persist = () => saveState(TOOL, state);

  const summaryText = () => {
    const result = readinessScore(questions, state.answers, categories);
    return [
      `Growth Readiness Assessment: ${result.score}/100 (${readinessBand(result.score)})`,
      ...result.categories.map((category) => `${category.label}: ${category.score}/100`),
      result.priorities.length ? 'Top priorities:' : '',
      ...result.priorities.map((item, index) => {
        const question = questions.find((q) => q.id === item.questionId);
        return `${index + 1}. ${question.options[item.optionIndex].recommendation}`;
      }),
    ]
      .filter(Boolean)
      .join('\n');
  };

  const renderQuestion = (focusHeading = false) => {
    const index = Math.min(state.step, questions.length - 1);
    const question = questions[index];
    const name = nextId('lab-q');
    const errorId = `${name}-error`;
    const error = h('p', { class: 'field__error', id: errorId, hidden: true, text: 'Choose the option that fits best to continue.' });

    const options = question.options.map((option, optionIndex) => {
      const input = h('input', { type: 'radio', name, value: String(optionIndex), class: 'lab-option__input' });
      input.checked = state.answers[question.id] === optionIndex;
      input.addEventListener('change', () => {
        state.answers[question.id] = optionIndex;
        error.hidden = true;
        persist();
      });
      return h('label', { class: 'lab-option' }, input, h('span', { class: 'lab-option__mark', 'aria-hidden': 'true' }), h('span', { class: 'lab-option__text', text: option.label }));
    });

    const progress = Math.round((index / questions.length) * 100);
    const back = h('button', { type: 'button', class: 'btn btn--ghost btn--sm', disabled: index === 0 }, 'Back');
    const next = h('button', { type: 'submit', class: 'btn btn--primary btn--sm' }, h('span', { text: index === questions.length - 1 ? 'See my results' : 'Next' }), icon('arrow-right'));
    const heading = h('legend', { class: 'lab-question__prompt', tabindex: '-1', text: question.prompt });

    const form = h(
      'form',
      { class: 'lab-question', novalidate: true },
      h(
        'div',
        { class: 'lab-progress' },
        h('p', { class: 'lab-progress__label mono' }, `Question ${index + 1} of ${questions.length}`, h('span', { class: 'text-muted', text: ` · ${categoryLabel(question.category)}` })),
        h('div', { class: 'lab-progress__track', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': progress, 'aria-label': 'Assessment progress' }, h('span', { class: 'lab-progress__fill', style: { '--w': `${progress}%` } })),
      ),
      h('fieldset', { class: 'lab-question__set', 'aria-describedby': errorId }, heading, h('div', { class: 'lab-options' }, ...options)),
      error,
      h('div', { class: 'lab-actions lab-actions--between' }, back, next),
    );

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!Number.isInteger(state.answers[question.id])) {
        error.hidden = false;
        form.querySelector('input')?.focus();
        return;
      }
      if (index === questions.length - 1) {
        state.done = true;
        persist();
        renderResults();
        return;
      }
      state.step = index + 1;
      persist();
      renderQuestion(true);
    });
    back.addEventListener('click', () => {
      state.step = Math.max(index - 1, 0);
      persist();
      renderQuestion(true);
    });

    root.replaceChildren(index === 0 ? notice(disclaimer) : '', form, status);
    if (focusHeading) {
      heading.focus();
      root.closest('.lab-modal__body')?.scrollTo({ top: 0 });
    }
  };

  const renderResults = () => {
    const result = readinessScore(questions, state.answers, categories);
    if (!result.complete) {
      state.done = false;
      state.step = questions.findIndex((question) => !Number.isInteger(state.answers[question.id]));
      renderQuestion();
      return;
    }
    const band = readinessBand(result.score);

    const retake = h('button', { type: 'button', class: 'btn btn--ghost btn--sm' }, icon('refresh-cw'), 'Retake assessment');
    retake.addEventListener('click', () => {
      clearState(TOOL);
      Object.assign(state, { answers: {}, step: 0, done: false });
      renderQuestion(true);
    });
    const discuss = h('button', { type: 'button', class: 'btn btn--primary btn--sm' }, h('span', { text: 'Discuss my results' }), icon('arrow-right'));
    discuss.addEventListener('click', () => openTool('brief', { payload: { source: 'Growth Readiness Assessment', summary: summaryText() } }));

    const title = h('h3', { class: 'lab-score__band', tabindex: '-1', text: band });

    root.replaceChildren(
      h(
        'div',
        { class: 'lab-score' },
        h(
          'div',
          { class: 'lab-score__ring', style: { '--p': result.score }, role: 'img', 'aria-label': `Score ${result.score} out of 100` },
          h('span', { class: 'lab-score__value', text: String(result.score) }),
          h('span', { class: 'lab-score__max mono', text: '/ 100' }),
        ),
        h('div', { class: 'lab-score__text' }, h('p', { class: 'mono text-muted', text: 'Readiness level' }), title, h('p', { class: 'text-muted', text: BAND_TEXT[band] })),
      ),
      barChart({
        title: 'Score by area',
        rows: result.categories.map((category) => ({ label: category.label, value: category.score, display: `${category.score}` })),
        summary: result.categories.map((category) => `${category.label} ${category.score} out of 100`).join(', '),
      }),
      result.strengths.length > 0 &&
        h(
          'div',
          { class: 'lab-block' },
          sectionHeading('Strengths'),
          h('ul', { class: 'check-list' }, ...result.strengths.map((category) => h('li', {}, icon('check'), h('span', { text: `${category.label} (${category.score}/100)` })))),
        ),
      h(
        'div',
        { class: 'lab-block' },
        sectionHeading(result.priorities.length ? 'Top priorities' : 'No priority gaps', result.priorities.length ? 'Ordered by the size of the gap, then by question order.' : 'Every answer was already at the strongest option.'),
        result.priorities.length > 0 &&
          h(
            'ol',
            { class: 'lab-priorities' },
            ...result.priorities.map((item) => {
              const question = questions.find((q) => q.id === item.questionId);
              return h(
                'li',
                { class: 'lab-priority' },
                h('p', { class: 'lab-priority__area mono', text: categoryLabel(item.category) }),
                h('p', { class: 'lab-priority__text', text: question.options[item.optionIndex].recommendation }),
              );
            }),
          ),
      ),
      notice(disclaimer, 'warn'),
      h('div', { class: 'lab-actions' }, copyButton(summaryText, 'Copy summary'), retake, discuss),
      status,
    );
    status.textContent = `Assessment complete. Score ${result.score} out of 100, ${band}.`;
    title.focus();
    root.closest('.lab-modal__body')?.scrollTo({ top: 0 });
  };

  if (state.done) renderResults();
  else renderQuestion();
  return root;
}
