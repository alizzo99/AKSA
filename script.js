document.addEventListener("DOMContentLoaded", function() {
  /********************************
   * متغيرات عامة
   ********************************/
  const selectedAvatars = {};
  let players = [];          // { name, avatar, answer, score }
  let currentQuestion = {};  // { question, correctAnswer }
  let currentPlayerIndex = 0;
  let roundTimerValue = 30;
  let roundTimerInterval;
  let selectedCategory = null;
  let currentRound = 1;
  let totalRounds = 10;
  let finalOptions = []; // الخيارات النهائية (كائنات)
  let votes = [];        // لتسجيل اختيارات اللاعبين في مرحلة المراجعة

  /********************************
   * إدارة الشاشات
   ********************************/
  const screen1 = document.getElementById("screen1");
  const screen2 = document.getElementById("screen2");
  const screen3_2 = document.getElementById("screen3_2");
  const screen4 = document.getElementById("screen4");
  const screen5 = document.getElementById("screen5");
  const screen7 = document.getElementById("screen7");

  /********************************
   * أزرار التنقل
   ********************************/
  const btnStart = document.getElementById("btnStart");
  const btnPlayersDone = document.getElementById("btnPlayersDone");
  const chooseCategoryBtn = document.getElementById("chooseCategoryBtn");
  const btnAnswerNext = document.getElementById("btnAnswerNext");
  const newRoundBtn = document.getElementById("newRoundBtn");

  btnPlayersDone.addEventListener("click", () => {
    players = [];
    playerBlocks.forEach(block => {
      const nameInput = block.querySelector(".player-name-input");
      const avatarSelected = block.querySelector(".avatar-item.selected");
      if (!nameInput.value.trim() || !avatarSelected) {
        alert(`يرجى تعبئة بيانات اللاعب ${block.getAttribute('data-player')} بالكامل!`);
        return;
      }
      players.push({
        name: nameInput.value.trim(),
        avatar: avatarSelected.getAttribute("src"),
        answer: "",
        score: 0
      });
    });

    // إضافة بيانات اللاعبين إلى Firebase بعد تحديدها
    if (players.length === 4) {
      // إرسال بيانات اللاعبين إلى Firebase (Realtime Database)
      players.forEach((player, index) => {
        const playerRef = firebase.database().ref('game/players/player' + (index + 1));
        playerRef.set({
          name: player.name,
          avatar: player.avatar,
          score: player.score,
          answer: player.answer
        });
      });

      // إخفاء شاشة 2 وعرض شاشة 3
      screen2.classList.remove("active");
      showPlayersBar();
      screen3_2.classList.add("active");
    }
  });

  /********************************
   * شاشة 1 -> شاشة 2
   ********************************/
  btnStart.addEventListener("click", () => {
    screen1.classList.remove("active");
    screen2.classList.add("active");
  });

  /********************************
   * شاشة 2: اختيار الأفاتار وأسماء اللاعبين
   ********************************/
  const playerBlocks = document.querySelectorAll(".player-block");
  playerBlocks.forEach(block => {
    const avatarImgs = block.querySelectorAll(".avatar-item");
    const currentPlayerId = block.getAttribute("data-player");
    avatarImgs.forEach(img => {
      img.addEventListener("click", () => {
        const avatarId = img.getAttribute("data-id");
        if (selectedAvatars[avatarId] && selectedAvatars[avatarId] !== currentPlayerId) {
          alert("هذا الأفاتار تم اختياره مسبقًا من قبل لاعب آخر!");
          return;
        }
        // إزالة التحديد السابق
        avatarImgs.forEach(i => {
          if (i.classList.contains("selected")) {
            const prevId = i.getAttribute("data-id");
            if (selectedAvatars[prevId] === currentPlayerId) {
              delete selectedAvatars[prevId];
            }
            i.classList.remove("selected");
          }
        });
        img.classList.add("selected");
        selectedAvatars[avatarId] = currentPlayerId;
      });
    });
  });

  btnPlayersDone.addEventListener("click", () => {
    players = [];
    playerBlocks.forEach(block => {
      const nameInput = block.querySelector(".player-name-input");
      const avatarSelected = block.querySelector(".avatar-item.selected");
      if (!nameInput.value.trim() || !avatarSelected) {
        alert(`يرجى تعبئة بيانات اللاعب ${block.getAttribute('data-player')} بالكامل!`);
        return;
      }
      players.push({
        name: nameInput.value.trim(),
        avatar: avatarSelected.getAttribute("src"),
        answer: "",
        score: 0
      });
    });
    if (players.length === 4) {
      screen2.classList.remove("active");
      showPlayersBar();
      screen3_2.classList.add("active");
    }
  });

  /********************************
   * دالة لعرض اللاعبين في الشريط العلوي
   ********************************/
  function showPlayersBar() {
    const playersBar = document.getElementById("playersBar");
    playersBar.innerHTML = "";
    players.forEach(player => {
      const playerItem = document.createElement("div");
      playerItem.classList.add("player-item");
      const avatarImg = document.createElement("img");
      avatarImg.classList.add("player-avatar");
      avatarImg.src = player.avatar;
      const playerName = document.createElement("span");
      playerName.classList.add("player-name");
      playerName.textContent = player.name;
      playerItem.appendChild(avatarImg);
      playerItem.appendChild(playerName);
      playersBar.appendChild(playerItem);
    });
  }

  /********************************
   * شاشة 3: اختيار التصنيف
   ********************************/
  const categoryButtons = document.querySelectorAll(".cat-btn");
  categoryButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      categoryButtons.forEach(b => b.classList.remove("selected-cat"));
      btn.classList.add("selected-cat");
      selectedCategory = btn.getAttribute("data-cat");
    });
  });

  chooseCategoryBtn.addEventListener("click", () => {
    if (!selectedCategory) {
      alert("الرجاء اختيار فئة!");
      return;
    }
    currentQuestion = getQuestionForCategory(selectedCategory);
    document.getElementById("currentQuestion").textContent = currentQuestion.question;
    startRoundTimer();
    currentPlayerIndex = 0;
    loadPlayerAnswer();
    screen3_2.classList.remove("active");
    screen4.classList.add("active");
  });

  /********************************
   * شاشة 4: إدخال الإجابات
   ********************************/
  function loadPlayerAnswer() {
    const playerAnswerTitle = document.getElementById("playerAnswerTitle");
    playerAnswerTitle.textContent = `${players[currentPlayerIndex].name}: أدخل إجابتك`;
    document.getElementById("playerAnswerInput").value = "";
  }

  function startRoundTimer() {
    clearInterval(roundTimerInterval);
    roundTimerValue = 30;
    document.getElementById("roundTimer").textContent = roundTimerValue;
    roundTimerInterval = setInterval(() => {
      roundTimerValue--;
      document.getElementById("roundTimer").textContent = roundTimerValue;
      if (roundTimerValue <= 0) {
        clearInterval(roundTimerInterval);
        processPlayerAnswer("");
      }
    }, 1000);
  }

  // دالة تتحقق هل الإجابة قريبة من الصحيح بفارق حرف واحد
  function isVeryCloseToCorrect(answer, correct) {
    // إذا نفس الطول، ونختلف بحرف واحد فقط
    if (answer.length !== correct.length) return false;
    let diffCount = 0;
    for (let i = 0; i < answer.length; i++) {
      if (answer[i].toLowerCase() !== correct[i].toLowerCase()) {
        diffCount++;
        if (diffCount > 1) return false;
      }
    }
    return diffCount === 1;
  }

  function processPlayerAnswer(answer) {
    // 1) إذا اللاعب كتب الجواب الصحيح بالضبط
    if (answer.toLowerCase() === currentQuestion.correctAnswer.toLowerCase()) {
      alert("هذه هي الإجابة الصحيحة!");
      return; // لا ننتقل للاعب التالي
    }

    // 2) إذا اللاعب كتب جوابًا قريبًا جدًا من الصحيح (فارق حرف واحد)
    if (isVeryCloseToCorrect(answer, currentQuestion.correctAnswer)) {
      alert("إجابتك قريبة جدًا من الصحيح، تم استبدالها بإجابة وهمية!");
      answer = "DummyClose"; // استبدل بإجابة وهمية
    }

    players[currentPlayerIndex].answer = answer;
    currentPlayerIndex++;
    if (currentPlayerIndex < players.length) {
      loadPlayerAnswer();
    } else {
      finalOptions = computeFinalOptions();
      votes = new Array(players.length);
      currentPlayerIndex = 0;
      screen4.classList.remove("active");
      screen5.classList.add("active");
      showReviewForCurrentPlayer();
    }
  }

  btnAnswerNext.addEventListener("click", () => {
    const playerAnswerInput = document.getElementById("playerAnswerInput");
    let answer = playerAnswerInput.value.trim();
    // إذا اللاعب لم يكتب شيئًا
    if (!answer) {
      alert("يرجى إدخال إجابتك!");
      return;
    }
    processPlayerAnswer(answer);
  });

  /********************************
   * الحصول على السؤال وفق التصنيف
   ********************************/
  function getQuestionForCategory(category) {
    const questions = {
      علوم: {
        question: "ما هو العنصر الأكثر وفرة في قشرة الأرض؟",
        correctAnswer: "الأكسجين"
      },
      تاريخ: {
        question: "من هو أول الخلفاء الراشدين؟",
        correctAnswer: "أبو بكر"
      },
      جغرافيا: {
        question: "ما هي عاصمة المملكة العربية السعودية؟",
        correctAnswer: "الرياض"
      },
      أفلام: {
        question: "من هو مخرج فيلم 'البداية'؟",
        correctAnswer: "كريستوفر نولان"
      },
      بلدان: {
        question: "أي دولة تقع في جنوب أوروبا؟",
        correctAnswer: "إيطاليا"
      },
      رياضة: {
        question: "من فاز بكأس العالم لكرة القدم عام 2018؟",
        correctAnswer: "فرنسا"
      }
    };
    return questions[category];
  }

  /********************************
   * دمج الإجابات المكررة + إضافة صحيح + dummy
   ********************************/
  function computeFinalOptions() {
    const uniqueMap = {};
    players.forEach((player, index) => {
      const txt = player.answer;
      if (uniqueMap[txt]) {
        uniqueMap[txt].authors.push(index);
      } else {
        uniqueMap[txt] = { text: txt, authors: [index], isCorrect: false, isDummy: false };
      }
    });
    let uniqueAnswers = Object.values(uniqueMap);
    // إضافة الصحيح
    const correctOption = { text: currentQuestion.correctAnswer, authors: [], isCorrect: true, isDummy: false };
    uniqueAnswers.push(correctOption);

    // نريد 5 خيارات (4 لاعبين + صحيح)
    const desiredCount = players.length + 1;
    while (uniqueAnswers.length < desiredCount) {
      uniqueAnswers.push({ text: "Dummy", authors: [], isCorrect: false, isDummy: true });
    }
    return uniqueAnswers;
  }

  /********************************
   * شاشة 5: مراجعة الإجابات (عرض 5 خيارات)
   ********************************/
  const reviewTitle = document.getElementById("reviewTitle");
  const questionText5 = document.getElementById("questionText5");
  const optionsContainer = document.getElementById("optionsContainer");
  const roundNumberText = document.getElementById("roundNumberText");

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function showReviewForCurrentPlayer() {
    roundNumberText.textContent = `جولة ${currentRound}/${totalRounds}`;
    reviewTitle.textContent = `مراجعة الإجابة للاعب ${players[currentPlayerIndex].name}`;
    questionText5.textContent = currentQuestion.question;

    // لكل لاعب، نعرض نفس الخيارات لكن بترتيب عشوائي
    const optionsForPlayer = shuffleArray([...finalOptions]);
    optionsContainer.innerHTML = "";

    optionsForPlayer.forEach(option => {
      const btn = document.createElement("button");
      btn.classList.add("choice-btn");
      btn.textContent = option.text;
      btn.addEventListener("click", () => {
        votes[currentPlayerIndex] = option;
        currentPlayerIndex++;
        if (currentPlayerIndex < players.length) {
          showReviewForCurrentPlayer();
        } else {
          computeScores();
          showRoundResults();
          screen5.classList.remove("active");
          screen7.classList.add("active");
        }
      });
      optionsContainer.appendChild(btn);
    });
  }

  /********************************
   * حساب النقاط (يشمل شرط 3: إذا اختار جواب وهمي => لا نقاط)
   ********************************/
  function computeScores() {
    // إعادة تعيين النقاط
    players.forEach(player => player.score = 0);

    // مرحلة أولية: نجمع الأصوات
    for (let i = 0; i < votes.length; i++) {
      const vote = votes[i];
      // 1) إذا اختار الصحيح => +2 نقطة للاعب i
      if (vote.isCorrect) {
        players[i].score += 2;
      }
      // 2) إذا كان dummy => 0 نقطة
      else if (vote.isDummy) {
        // لا شيء
      }
      // 3) إذا كانت إجابة من لاعبين
      else {
        // إذا اللاعب اختار إجابته الخاصة => 0
        if (vote.authors.includes(i)) {
          // لا نقاط
        } else {
          // احسب عدد الأصوات الخارجية على هذه الإجابة
          // (في هذا الكود البسيط نحسبها لاحقًا؛ ولكن لتبسيط)
          if (vote.authors.length === 1) {
            // صاحب الإجابة يحصل على 1 نقطة
            players[vote.authors[0]].score += 1;
          } else {
            // إجابة مشتركة (لها مؤلفان أو أكثر)
            // حسب القاعدة: إذا اختارها لاعب واحد => كل مؤلف يحصل على 1 نقطة
            // إذا اختارها لاعبان => كل مؤلف يحصل على 2 نقطة
            // سنجمع أصوات خارجية لاحقًا
          }
        }
      }
    }

    // حساب الأصوات الخارجية للإجابات المشتركة
    const optionVotesCount = {};
    for (let i = 0; i < votes.length; i++) {
      const vote = votes[i];
      // إذا لم يكن صحيح ولم يكن dummy ولم يكن من مؤلفه
      if (!vote.isCorrect && !vote.isDummy && !vote.authors.includes(i)) {
        const key = vote.text;
        if (!optionVotesCount[key]) {
          optionVotesCount[key] = 0;
        }
        optionVotesCount[key]++;
      }
    }
    // الآن نضيف النقاط للمؤلفين بناءً على عدد الأصوات
    for (let [txt, count] of Object.entries(optionVotesCount)) {
      const opt = finalOptions.find(o => o.text === txt);
      if (!opt) continue;
      if (opt.authors.length >= 2) {
        // إذا اختارها لاعب واحد => كل مؤلف +1
        // إذا اختارها لاعبان => كل مؤلف +2
        if (count === 1) {
          opt.authors.forEach(author => {
            players[author].score += 1;
          });
        } else if (count === 2) {
          opt.authors.forEach(author => {
            players[author].score += 2;
          });
        }
        // ...إلخ، يمكنك توسعة المنطق كما تريد
      }
    }
  }

  /********************************
   * عرض النتائج في الشاشة الأخيرة
   ********************************/
  function showRoundResults() {
    const finalResultsContainer = document.getElementById("finalResults");
    let resultsHTML = "<h3>نتائج الجولة</h3><ul>";
    players.forEach(player => {
      resultsHTML += `<li>${player.name}: ${player.score} نقطة</li>`;
    });
    resultsHTML += "</ul>";
    finalResultsContainer.innerHTML = resultsHTML;
  }

  /********************************
   * زر "جولة جديدة"
   ********************************/
  newRoundBtn.addEventListener("click", () => {
    players.forEach(player => player.score = 0);
    currentPlayerIndex = 0;
    screen7.classList.remove("active");
    screen4.classList.add("active");
    loadPlayerAnswer();
    startRoundTimer();
  });
});
