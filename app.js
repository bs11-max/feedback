(() => {
  'use strict';

  const config = window.__APP_CONFIG__;
  const sdk = window.supabase;

  const studentView = document.querySelector('#student-view');
  const adminView = document.querySelector('#admin-view');
  const openLoginButton = document.querySelector('#open-login-button');
  const closeLoginButton = document.querySelector('#close-login-button');
  const loginDialog = document.querySelector('#login-dialog');
  const loginForm = document.querySelector('#login-form');
  const loginButton = document.querySelector('#login-button');
  const loginMessage = document.querySelector('#login-message');
  const voteMessage = document.querySelector('#vote-message');
  const adminMessage = document.querySelector('#admin-message');
  const ratingButtons = [...document.querySelectorAll('[data-rating]')];
  const refreshButton = document.querySelector('#refresh-button');
  const resetButton = document.querySelector('#reset-button');
  const logoutButton = document.querySelector('#logout-button');

  if (!config?.supabaseUrl || !config?.supabasePublishableKey || !sdk?.createClient) {
    showMessage(voteMessage, '앱 설정을 불러오지 못했습니다. 관리자에게 문의해 주세요.', true);
    ratingButtons.forEach((button) => {
      button.disabled = true;
    });
    openLoginButton.disabled = true;
    return;
  }

  const supabaseClient = sdk.createClient(
    config.supabaseUrl,
    config.supabasePublishableKey,
  );

  const resultElements = {
    satisfied: {
      count: document.querySelector('#satisfied-count'),
      rate: document.querySelector('#satisfied-rate'),
      bar: document.querySelector('#satisfied-bar'),
    },
    neutral: {
      count: document.querySelector('#neutral-count'),
      rate: document.querySelector('#neutral-rate'),
      bar: document.querySelector('#neutral-bar'),
    },
    dissatisfied: {
      count: document.querySelector('#dissatisfied-count'),
      rate: document.querySelector('#dissatisfied-rate'),
      bar: document.querySelector('#dissatisfied-bar'),
    },
  };

  openLoginButton.addEventListener('click', () => {
    loginMessage.textContent = '';
    loginDialog.showModal();
    document.querySelector('#email').focus();
  });

  closeLoginButton.addEventListener('click', () => loginDialog.close());

  loginDialog.addEventListener('click', (event) => {
    if (event.target === loginDialog) {
      loginDialog.close();
    }
  });

  loginForm.addEventListener('submit', handleLogin);

  ratingButtons.forEach((button) => {
    button.addEventListener('click', () => submitVote(button.dataset.rating));
  });

  refreshButton.addEventListener('click', loadResults);
  resetButton.addEventListener('click', resetResults);
  logoutButton.addEventListener('click', handleLogout);

  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || !session) {
      showStudentView();
      return;
    }

    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
      showAdminView();
      window.setTimeout(loadResults, 0);
    }
  });

  initializeSession();

  async function initializeSession() {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error || !data.session) {
      showStudentView();
      return;
    }

    showAdminView();
    await loadResults();
  }

  async function submitVote(rating) {
    if (!['satisfied', 'neutral', 'dissatisfied'].includes(rating)) {
      return;
    }

    setButtonsBusy(ratingButtons, true);
    showMessage(voteMessage, '투표를 저장하고 있습니다.');

    const { error } = await supabaseClient.from('votes').insert({ rating });

    if (error) {
      setButtonsBusy(ratingButtons, false);
      showMessage(voteMessage, '투표를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.', true);
      return;
    }

    showMessage(voteMessage, '투표가 완료되었습니다. 감사합니다.');
  }

  async function handleLogin(event) {
    event.preventDefault();
    loginMessage.textContent = '';
    loginButton.disabled = true;
    loginButton.textContent = '로그인 중...';

    const formData = new FormData(loginForm);
    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '');

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

    loginButton.disabled = false;
    loginButton.textContent = '로그인';

    if (error) {
      loginMessage.textContent = '이메일 또는 비밀번호를 확인해 주세요.';
      return;
    }

    loginForm.reset();
    loginDialog.close();
  }

  async function loadResults() {
    setButtonsBusy([refreshButton, resetButton, logoutButton], true);
    showMessage(adminMessage, '결과를 불러오는 중입니다.');

    const { data, error } = await supabaseClient.from('votes').select('rating');

    setButtonsBusy([refreshButton, resetButton, logoutButton], false);

    if (error) {
      showMessage(adminMessage, '결과를 불러오지 못했습니다. 다시 시도해 주세요.', true);
      return;
    }

    const counts = {
      satisfied: 0,
      neutral: 0,
      dissatisfied: 0,
    };

    for (const vote of data) {
      if (Object.hasOwn(counts, vote.rating)) {
        counts[vote.rating] += 1;
      }
    }

    renderResults(counts);
    adminMessage.textContent = '';
    adminMessage.classList.remove('is-error');
    document.querySelector('#last-updated').textContent =
      `${new Intl.DateTimeFormat('ko-KR', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date())} 기준`;
  }

  async function resetResults() {
    const confirmed = window.confirm(
      '모든 투표 결과를 초기화하시겠습니까? 삭제된 결과는 복구할 수 없습니다.',
    );

    if (!confirmed) {
      return;
    }

    setButtonsBusy([refreshButton, resetButton, logoutButton], true);
    showMessage(adminMessage, '투표 결과를 초기화하고 있습니다.');

    const { error } = await supabaseClient.from('votes').delete().gte('id', 1);

    setButtonsBusy([refreshButton, resetButton, logoutButton], false);

    if (error) {
      showMessage(adminMessage, '투표 결과를 초기화하지 못했습니다.', true);
      return;
    }

    renderResults({ satisfied: 0, neutral: 0, dissatisfied: 0 });
    showMessage(adminMessage, '모든 투표 결과를 초기화했습니다.');
    document.querySelector('#last-updated').textContent = '방금 초기화됨';
  }

  async function handleLogout() {
    logoutButton.disabled = true;
    const { error } = await supabaseClient.auth.signOut();
    logoutButton.disabled = false;

    if (error) {
      showMessage(adminMessage, '로그아웃하지 못했습니다. 다시 시도해 주세요.', true);
      return;
    }

    showStudentView();
  }

  function renderResults(counts) {
    const total = counts.satisfied + counts.neutral + counts.dissatisfied;
    document.querySelector('#total-count').textContent = String(total);

    for (const [rating, count] of Object.entries(counts)) {
      const percentage = total === 0 ? 0 : (count / total) * 100;
      resultElements[rating].count.textContent = String(count);
      resultElements[rating].rate.textContent = `${formatPercentage(percentage)}%`;
      resultElements[rating].bar.style.width = `${percentage}%`;
    }
  }

  function formatPercentage(value) {
    if (Number.isInteger(value)) {
      return String(value);
    }

    return value.toFixed(1);
  }

  function showStudentView() {
    studentView.hidden = false;
    adminView.hidden = true;
    openLoginButton.hidden = false;
  }

  function showAdminView() {
    studentView.hidden = true;
    adminView.hidden = false;
    openLoginButton.hidden = true;
  }

  function setButtonsBusy(buttons, busy) {
    buttons.forEach((button) => {
      button.disabled = busy;
    });
  }

  function showMessage(element, message, isError = false) {
    element.textContent = message;
    element.classList.toggle('is-error', isError);
  }
})();

