/**
 * Arabictextcounter.online — Core Tool Engine
 * Pure Vanilla JavaScript (ES6+)
 * Fully Unicode-aware for Urdu, Arabic, English, and mixed-direction scripts.
 */

(function () {
  'use strict';

  // Configurable Parameters
  const CONFIG = {
    DEFAULT_LIMIT: 280,
    READING_WPM: 160, // Average reading speed for Arabic and Urdu text
    SAMPLE_URDU: 'علم حاصل کرنا ہر انسان کے لیے ضروری ہے۔ محنت، خلوص اور مستقل مزاجی سے انسان زندگی کے ہر میدان میں کامیابی حاصل کر سکتا ہے۔ کیا آپ جانتے ہیں کہ اردو ایک خوبصورت اور وسیع زبان ہے؟ آئیے اپنے خیالات کو خوبصورت الفاظ میں قلمبند کریں۔',
    SAMPLE_ARABIC: 'اللُّغَةُ العَرَبِيَّةُ هِيَ إِحْدَى أَكْثَرِ اللُّغَاتِ انْتِشَارًا فِي العَالَمِ، وَتَتَمَيَّزُ بِبَلَاغَتِهَا وَجَمَالِ خَطِّهَا وَغَزَارَةِ مُفْرَدَاتِهَا. هَلْ تَعْلَمُ أَنَّ حِسَابَ الحُرُوفِ بِدِقَّةٍ يُسَاعِدُ فِي كِتَابَةِ مُحْتَوًى مُتَنَاسِقٍ؟'
  };

  // DOM Elements
  const elements = {
    // Textarea & controls
    textarea: document.getElementById('mainTextarea'),
    clearBtn: document.getElementById('clearTextBtn'),
    copyBtn: document.getElementById('copyTextBtn'),
    downloadBtn: document.getElementById('downloadTextBtn'),
    sampleUrduBtn: document.getElementById('sampleUrduBtn'),
    sampleArabicBtn: document.getElementById('sampleArabicBtn'),
    statusFeedback: document.getElementById('statusFeedback'),
    fontFamilySelect: document.getElementById('fontFamilySelect'),
    fontSizeSelect: document.getElementById('fontSizeSelect'),
    textDirSelect: document.getElementById('textDirSelect'),

    // Live Stats
    statCharsWithSpaces: document.getElementById('statCharsWithSpaces'),
    statCharsNoSpaces: document.getElementById('statCharsNoSpaces'),
    statWords: document.getElementById('statWords'),
    statSentences: document.getElementById('statSentences'),
    statParagraphs: document.getElementById('statParagraphs'),
    statLines: document.getElementById('statLines'),
    statWhitespace: document.getElementById('statWhitespace'),
    statReadingTime: document.getElementById('statReadingTime'),
    statGraphemes: document.getElementById('statGraphemes'),
    statDiacritics: document.getElementById('statDiacritics'),

    // Character Limit Controls
    charLimitInput: document.getElementById('charLimitInput'),
    limitModeSelect: document.getElementById('limitModeSelect'),
    limitProgressFill: document.getElementById('limitProgressFill'),
    limitRemainingText: document.getElementById('limitRemainingText'),
    limitPercentText: document.getElementById('limitPercentText'),
    limitStatusBadge: document.getElementById('limitStatusBadge'),
    limitOverAlert: document.getElementById('limitOverAlert'),
    limitOverCount: document.getElementById('limitOverCount'),
    presetPills: document.querySelectorAll('.preset-pill'),
    resetLimitBtn: document.getElementById('resetLimitBtn'),

    // Navigation & UI
    mobileMenuBtn: document.getElementById('mobileMenuBtn'),
    mobileDrawer: document.getElementById('mobileDrawer'),
    faqItems: document.querySelectorAll('.faq-item'),
    copyStatBtns: document.querySelectorAll('.stat-copy-btn')
  };

  // State
  let state = {
    limit: CONFIG.DEFAULT_LIMIT,
    limitIncludeSpaces: true,
    fontFamily: 'auto',
    fontSize: 'md',
    direction: 'auto'
  };

  /**
   * Unicode-Aware Text Analysis Engine
   */
  function analyzeText(text) {
    if (!text || text.length === 0) {
      return {
        codePoints: 0,
        graphemes: 0,
        whitespace: 0,
        charsNoSpaces: 0,
        words: 0,
        sentences: 0,
        paragraphs: 0,
        lines: 0,
        readingTime: '0 min',
        diacritics: 0
      };
    }

    // 1. Unicode Code Points (Array.from splits accurately by surrogate pairs)
    const codePointsCount = Array.from(text).length;

    // 2. User-perceived Grapheme Clusters (Intl.Segmenter where supported)
    let graphemesCount = codePointsCount;
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      try {
        const graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
        graphemesCount = Array.from(graphemeSegmenter.segment(text)).length;
      } catch (e) {
        graphemesCount = codePointsCount;
      }
    }

    // 3. Whitespace & Non-Whitespace Characters
    // Unicode-aware whitespace matcher (\s, non-breaking space \u00A0, zero-width space \u200B, etc.)
    const whitespaceMatches = text.match(/[\s\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]/g);
    const whitespaceCount = whitespaceMatches ? whitespaceMatches.length : 0;
    const charsNoSpacesCount = Math.max(0, codePointsCount - whitespaceCount);

    // 4. Arabic and Urdu Diacritics (Harakat / Tashkeel / Zer / Zabar / Pesh / Tanwin)
    // Range covers Arabic vowels U+064B to U+065F, Superscript Alef U+0670, and Quranic/Urdu marks
    const diacriticsMatches = text.match(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g);
    const diacriticsCount = diacriticsMatches ? diacriticsMatches.length : 0;

    // 5. Word Segmentation
    let wordsCount = 0;
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      try {
        const wordSegmenter = new Intl.Segmenter(undefined, { granularity: 'word' });
        const segments = Array.from(wordSegmenter.segment(text));
        wordsCount = segments.filter(seg => seg.isWordLike).length;
      } catch (e) {
        // Fallback below
        wordsCount = fallbackWordCount(text);
      }
    } else {
      wordsCount = fallbackWordCount(text);
    }

    // 6. Sentence Segmentation (handles Arabic '؟', Urdu '۔', '!', '?', '.', '…')
    let sentencesCount = 0;
    const trimmed = text.trim();
    if (trimmed.length > 0) {
      // Split on standard and Arabic/Urdu sentence delimiters
      const sentenceTokens = trimmed.split(/[\u06D4\u061F.!?\u2026]+[\s\r\n]+|[\u06D4\u061F.!?\u2026]+$/);
      sentencesCount = sentenceTokens.filter(s => s.trim().length > 0).length;
      if (sentencesCount === 0 && trimmed.length > 0) {
        sentencesCount = 1;
      }
    }

    // 7. Paragraphs (non-empty blocks separated by newlines)
    const paragraphsCount = text
      .split(/\r\n|\r|\n/)
      .map(p => p.trim())
      .filter(p => p.length > 0).length;

    // 8. Total Lines
    const linesCount = text.length > 0 ? text.split(/\r\n|\r|\n/).length : 0;

    // 9. Estimated Reading Time
    const minutes = wordsCount / CONFIG.READING_WPM;
    let readingTime = '0 min';
    if (wordsCount > 0) {
      if (minutes < 1) {
        const seconds = Math.ceil(minutes * 60);
        readingTime = `${seconds} sec`;
      } else {
        const mins = Math.floor(minutes);
        const remSecs = Math.round((minutes - mins) * 60);
        readingTime = remSecs > 0 ? `${mins}m ${remSecs}s` : `${mins} min`;
      }
    }

    return {
      codePoints: codePointsCount,
      graphemes: graphemesCount,
      whitespace: whitespaceCount,
      charsNoSpaces: charsNoSpacesCount,
      words: wordsCount,
      sentences: sentencesCount,
      paragraphs: paragraphsCount,
      lines: linesCount,
      readingTime: readingTime,
      diacritics: diacriticsCount
    };
  }

  /**
   * Fallback Unicode Word Counter
   * Matches sequences of letters, combining marks, or numbers in any script.
   */
  function fallbackWordCount(text) {
    try {
      const matches = text.match(/[\p{L}\p{M}\p{N}]+/gu);
      return matches ? matches.length : 0;
    } catch (e) {
      // Basic regex fallback if unicode property escapes are unavailable
      const matches = text.trim().match(/[^\s.,!?;:"'()\[\]{}۔؟،]+/g);
      return matches ? matches.length : 0;
    }
  }

  /**
   * Updates the UI Dashboard and Statistics
   */
  function updateDashboard() {
    if (!elements.textarea) return;

    const text = elements.textarea.value;
    const stats = analyzeText(text);

    // Update Live Statistics Display
    if (elements.statCharsWithSpaces) elements.statCharsWithSpaces.textContent = stats.codePoints.toLocaleString();
    if (elements.statCharsNoSpaces) elements.statCharsNoSpaces.textContent = stats.charsNoSpaces.toLocaleString();
    if (elements.statWords) elements.statWords.textContent = stats.words.toLocaleString();
    if (elements.statSentences) elements.statSentences.textContent = stats.sentences.toLocaleString();
    if (elements.statParagraphs) elements.statParagraphs.textContent = stats.paragraphs.toLocaleString();
    if (elements.statLines) elements.statLines.textContent = stats.lines.toLocaleString();
    if (elements.statWhitespace) elements.statWhitespace.textContent = stats.whitespace.toLocaleString();
    if (elements.statReadingTime) elements.statReadingTime.textContent = stats.readingTime;
    if (elements.statGraphemes) elements.statGraphemes.textContent = stats.graphemes.toLocaleString();
    if (elements.statDiacritics) elements.statDiacritics.textContent = stats.diacritics.toLocaleString();

    // Update Character Limit Progress
    updateLimitChecker(stats);
  }

  /**
   * Updates Character Limit Progress Bar and Badges
   */
  function updateLimitChecker(stats) {
    const limit = state.limit;
    const currentCount = state.limitIncludeSpaces ? stats.codePoints : stats.charsNoSpaces;
    const remaining = limit - currentCount;
    const percentage = limit > 0 ? (currentCount / limit) * 100 : 0;
    const formattedPercent = Math.min(Math.round(percentage * 10) / 10, 999);

    // Progress bar fill width (capped at 100% visually)
    const fillWidth = Math.min(Math.max(percentage, 0), 100);
    if (elements.limitProgressFill) {
      elements.limitProgressFill.style.width = `${fillWidth}%`;
      elements.limitProgressFill.classList.remove('status-warning', 'status-danger');

      if (percentage > 100) {
        elements.limitProgressFill.classList.add('status-danger');
      } else if (percentage >= 80) {
        elements.limitProgressFill.classList.add('status-warning');
      }
    }

    // Remaining text & percentage text
    if (elements.limitRemainingText) {
      if (remaining >= 0) {
        elements.limitRemainingText.textContent = `${remaining.toLocaleString()} left`;
      } else {
        const overBy = Math.abs(remaining);
        elements.limitRemainingText.textContent = `${overBy.toLocaleString()} over limit`;
      }
    }

    if (elements.limitPercentText) {
      elements.limitPercentText.textContent = `${formattedPercent}% of ${limit.toLocaleString()}`;
    }

    // Status Badge & Over Alert
    if (elements.limitStatusBadge) {
      elements.limitStatusBadge.classList.remove('badge-under', 'badge-warning', 'badge-over');

      if (remaining < 0) {
        elements.limitStatusBadge.classList.add('badge-over');
        elements.limitStatusBadge.textContent = 'Exceeded Limit';
      } else if (percentage >= 80) {
        elements.limitStatusBadge.classList.add('badge-warning');
        elements.limitStatusBadge.textContent = 'Approaching Limit';
      } else {
        elements.limitStatusBadge.classList.add('badge-under');
        elements.limitStatusBadge.textContent = 'Within Limit';
      }
    }

    if (elements.limitOverAlert && elements.limitOverCount) {
      if (remaining < 0) {
        elements.limitOverCount.textContent = Math.abs(remaining).toLocaleString();
        elements.limitOverAlert.classList.add('visible');
      } else {
        elements.limitOverAlert.classList.remove('visible');
      }
    }
  }

  /**
   * Helper: Show brief status feedback message
   */
  function showFeedback(msg, isSuccess = true) {
    if (!elements.statusFeedback) return;
    elements.statusFeedback.textContent = msg;
    elements.statusFeedback.style.color = isSuccess ? 'var(--color-primary)' : 'var(--color-danger)';
    elements.statusFeedback.classList.add('visible');
    setTimeout(() => {
      elements.statusFeedback.classList.remove('visible');
    }, 2400);
  }

  /**
   * Clipboard Copy Helper
   */
  function copyTextToClipboard(text, successMsg) {
    if (!text || text.trim().length === 0) {
      showFeedback('No text to copy', false);
      return;
    }

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
        .then(() => showFeedback(successMsg || 'Copied to clipboard!'))
        .catch(() => fallbackCopy(text, successMsg));
    } else {
      fallbackCopy(text, successMsg);
    }
  }

  function fallbackCopy(text, successMsg) {
    try {
      const tempArea = document.createElement('textarea');
      tempArea.value = text;
      tempArea.style.position = 'fixed';
      tempArea.style.left = '-9999px';
      document.body.appendChild(tempArea);
      tempArea.focus();
      tempArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(tempArea);
      if (success) {
        showFeedback(successMsg || 'Copied to clipboard!');
      } else {
        showFeedback('Copy failed. Please copy manually.', false);
      }
    } catch (e) {
      showFeedback('Unable to copy', false);
    }
  }

  /**
   * Download text as a plain .txt file
   */
  function downloadTextFile() {
    const text = elements.textarea.value;
    if (!text || text.trim().length === 0) {
      showFeedback('Text area is empty', false);
      return;
    }

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `text-counter-export-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showFeedback('Text downloaded successfully!');
  }

  /**
   * Apply font style and size classes to textarea
   */
  function applyFontSettings() {
    if (!elements.textarea) return;

    elements.textarea.classList.remove('font-mode-arabic', 'font-mode-urdu', 'font-mode-sans');
    if (state.fontFamily === 'arabic') {
      elements.textarea.classList.add('font-mode-arabic');
    } else if (state.fontFamily === 'urdu') {
      elements.textarea.classList.add('font-mode-urdu');
    } else if (state.fontFamily === 'sans') {
      elements.textarea.classList.add('font-mode-sans');
    }

    elements.textarea.classList.remove('font-size-sm', 'font-size-md', 'font-size-lg');
    elements.textarea.classList.add(`font-size-${state.fontSize}`);

    if (state.direction === 'rtl') {
      elements.textarea.style.direction = 'rtl';
      elements.textarea.style.textAlign = 'right';
    } else if (state.direction === 'ltr') {
      elements.textarea.style.direction = 'ltr';
      elements.textarea.style.textAlign = 'left';
    } else {
      elements.textarea.style.direction = 'auto';
      elements.textarea.style.textAlign = 'start';
    }
  }

  /**
   * Set Preset Limit
   */
  function setLimitPreset(value, targetElement) {
    const numericVal = parseInt(value, 10);
    if (!isNaN(numericVal) && numericVal > 0) {
      state.limit = numericVal;
      if (elements.charLimitInput) elements.charLimitInput.value = numericVal;

      elements.presetPills.forEach(pill => pill.classList.remove('active'));
      if (targetElement) targetElement.classList.add('active');

      updateDashboard();
    }
  }

  /**
   * Setup Event Listeners
   */
  function setupEventListeners() {
    // 1. Textarea Events
    if (elements.textarea) {
      elements.textarea.addEventListener('input', updateDashboard);
      elements.textarea.addEventListener('change', updateDashboard);
      elements.textarea.addEventListener('paste', () => {
        setTimeout(updateDashboard, 10);
      });
    }

    // 2. Clear Button
    if (elements.clearBtn) {
      elements.clearBtn.addEventListener('click', () => {
        if (elements.textarea.value.length > 0) {
          elements.textarea.value = '';
          updateDashboard();
          showFeedback('Text cleared');
          elements.textarea.focus();
        }
      });
    }

    // 3. Copy Text Button
    if (elements.copyBtn) {
      elements.copyBtn.addEventListener('click', () => {
        copyTextToClipboard(elements.textarea.value, 'All text copied!');
      });
    }

    // 4. Download Button
    if (elements.downloadBtn) {
      elements.downloadBtn.addEventListener('click', downloadTextFile);
    }

    // 5. Sample Urdu Text
    if (elements.sampleUrduBtn) {
      elements.sampleUrduBtn.addEventListener('click', () => {
        elements.textarea.value = CONFIG.SAMPLE_URDU;
        state.fontFamily = 'urdu';
        if (elements.fontFamilySelect) elements.fontFamilySelect.value = 'urdu';
        applyFontSettings();
        updateDashboard();
        showFeedback('Urdu sample loaded');
      });
    }

    // 6. Sample Arabic Text
    if (elements.sampleArabicBtn) {
      elements.sampleArabicBtn.addEventListener('click', () => {
        elements.textarea.value = CONFIG.SAMPLE_ARABIC;
        state.fontFamily = 'arabic';
        if (elements.fontFamilySelect) elements.fontFamilySelect.value = 'arabic';
        applyFontSettings();
        updateDashboard();
        showFeedback('Arabic sample loaded');
      });
    }

    // 7. Font Style Controls
    if (elements.fontFamilySelect) {
      elements.fontFamilySelect.addEventListener('change', (e) => {
        state.fontFamily = e.target.value;
        applyFontSettings();
      });
    }

    if (elements.fontSizeSelect) {
      elements.fontSizeSelect.addEventListener('change', (e) => {
        state.fontSize = e.target.value;
        applyFontSettings();
      });
    }

    if (elements.textDirSelect) {
      elements.textDirSelect.addEventListener('change', (e) => {
        state.direction = e.target.value;
        applyFontSettings();
      });
    }

    // 8. Character Limit Controls
    if (elements.charLimitInput) {
      elements.charLimitInput.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        if (!isNaN(val) && val > 0) {
          state.limit = val;
          elements.presetPills.forEach(pill => pill.classList.remove('active'));
          updateDashboard();
        }
      });
    }

    if (elements.limitModeSelect) {
      elements.limitModeSelect.addEventListener('change', (e) => {
        state.limitIncludeSpaces = e.target.value === 'with_spaces';
        updateDashboard();
      });
    }

    // 9. Limit Presets
    elements.presetPills.forEach(pill => {
      pill.addEventListener('click', (e) => {
        const limitVal = e.target.getAttribute('data-limit');
        setLimitPreset(limitVal, e.target);
      });
    });

    if (elements.resetLimitBtn) {
      elements.resetLimitBtn.addEventListener('click', () => {
        state.limit = CONFIG.DEFAULT_LIMIT;
        state.limitIncludeSpaces = true;
        if (elements.charLimitInput) elements.charLimitInput.value = CONFIG.DEFAULT_LIMIT;
        if (elements.limitModeSelect) elements.limitModeSelect.value = 'with_spaces';
        elements.presetPills.forEach(p => {
          if (p.getAttribute('data-limit') === '280') p.classList.add('active');
          else p.classList.remove('active');
        });
        updateDashboard();
        showFeedback('Limit reset to 280');
      });
    }

    // 10. Copy Individual Stats
    elements.copyStatBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-stat-id');
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          copyTextToClipboard(targetEl.textContent.trim(), `Copied: ${targetEl.textContent.trim()}`);
        }
      });
    });

    // 11. Mobile Navigation Toggle
    if (elements.mobileMenuBtn && elements.mobileDrawer) {
      elements.mobileMenuBtn.addEventListener('click', () => {
        const isOpen = elements.mobileMenuBtn.getAttribute('aria-expanded') === 'true';
        elements.mobileMenuBtn.setAttribute('aria-expanded', !isOpen);
        elements.mobileDrawer.classList.toggle('open');
      });

      // Close mobile drawer when link clicked
      const mobileLinks = elements.mobileDrawer.querySelectorAll('a');
      mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
          elements.mobileMenuBtn.setAttribute('aria-expanded', 'false');
          elements.mobileDrawer.classList.remove('open');
        });
      });
    }

    // 12. FAQ Accordion Interaction
    elements.faqItems.forEach(item => {
      const questionBtn = item.querySelector('.faq-question');
      if (questionBtn) {
        questionBtn.addEventListener('click', () => {
          const isActive = item.classList.contains('active');
          // Close other items for single-accordion polish
          elements.faqItems.forEach(other => other.classList.remove('active'));
          if (!isActive) {
            item.classList.add('active');
          }
        });
      }
    });
  }

  // Initialize
  document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    applyFontSettings();
    updateDashboard();
  });

})();
