import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium, webkit } from 'playwright';

const url = process.env.WORD_GARDEN_URL || 'http://127.0.0.1:8768/word-garden/';
let browser;

test.before(async () => { browser = await webkit.launch(); });
test.after(async () => { await browser?.close(); });

async function withHarness(run) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.goto(url);
    await page.locator('#wheel .letter').first().waitFor();
    await page.evaluate(async () => {
      const { installTouches } = await import(new URL('touch.js', location.href).href);
      const root = document.createElement('div');
      root.id = 'touch-test-root';
      root.style.cssText = 'position:fixed;left:10px;top:10px;width:280px;height:310px;z-index:9999';
      const wheel = document.createElement('div');
      wheel.style.cssText = 'position:absolute;left:0;top:0;width:280px;height:210px';
      root.append(wheel);
      const buttons = {};
      for (const [index, letter] of ['A', 'A', 'B'].entries()) {
        const button = document.createElement('button');
        button.className = 'letter';
        button.dataset.tile = String(index);
        button.textContent = letter;
        button.style.cssText = `position:absolute;left:${15 + index * 85}px;top:80px;margin:0;width:60px;height:60px`;
        wheel.append(button);
        buttons[`tile${index}`] = button;
      }
      const action = document.createElement('button');
      action.textContent = 'Action';
      action.style.cssText = 'position:absolute;left:70px;top:225px;width:120px;height:52px';
      root.append(action);
      buttons.action = action;
      document.body.append(root);

      let mode = 'tap', epoch = 0, selection = [], actionCount = 0, tileCount = 0, cancelCount = 0;
      const paths = [];
      for (const button of Object.values(buttons).filter((value) => value !== action)) {
        button.addEventListener('click', () => {
          tileCount += 1;
          selection.push(Number(button.dataset.tile));
        });
      }
      action.addEventListener('click', () => { actionCount += 1; });
      const touch = installTouches({
        root, wheel,
        context: () => ({ epoch, mode }),
        mode: () => mode,
        onTile: () => {},
        onPath: (path) => { selection = [...path]; paths.push([...path]); },
        getSelection: () => [...selection],
        onCancel: () => { cancelCount += 1; },
      });
      window.__touchTest = {
        fire(type, name, id, options = {}) {
          const button = buttons[name];
          const rect = button.getBoundingClientRect();
          const event = new PointerEvent(type, {
            bubbles: true, cancelable: true,
            pointerId: id, pointerType: options.pointerType ?? 'touch',
            isPrimary: options.isPrimary ?? true,
            clientX: rect.left + rect.width / 2 + (options.dx ?? 0),
            clientY: rect.top + rect.height / 2 + (options.dy ?? 0),
          });
          (type === 'pointermove' ? document : button).dispatchEvent(event);
        },
        nativeClick(name) {
          buttons[name].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
        },
        assistiveClick(name) { buttons[name].click(); },
        setMode(value) { mode = value; },
        setEpoch(value) { epoch = value; },
        setSelection(value) { selection = [...value]; },
        cancel() { touch.cancel(); },
        state() { return { selection, paths, actionCount, tileCount, cancelCount }; },
      };
    });
    await run(page);
  } finally {
    await page.close();
  }
}

test('slow release and modest upward drift activate once; mouse and keyboard remain usable', async () => {
  await withHarness(async (page) => {
    await page.evaluate(() => __touchTest.fire('pointerdown', 'tile0', 1));
    await page.waitForTimeout(850);
    await page.evaluate(() => {
      __touchTest.fire('pointerup', 'tile0', 1);
      __touchTest.nativeClick('tile0');
    });
    assert.deepEqual((await page.evaluate(() => __touchTest.state())).selection, [0]);

    await page.evaluate(() => {
      __touchTest.fire('pointerdown', 'action', 2);
      __touchTest.fire('pointermove', 'action', 2, { dy: -20 });
    });
    await page.waitForTimeout(850);
    await page.evaluate(() => {
      __touchTest.fire('pointerup', 'action', 2, { dy: -20 });
      __touchTest.nativeClick('action');
    });
    assert.equal((await page.evaluate(() => __touchTest.state())).actionCount, 1);

    await page.evaluate(() => {
      __touchTest.assistiveClick('tile1');
      __touchTest.fire('pointerdown', 'action', 3, { pointerType: 'mouse' });
      __touchTest.fire('pointerup', 'action', 3, { pointerType: 'mouse' });
      __touchTest.nativeClick('action');
    });
    assert.deepEqual(await page.evaluate(() => __touchTest.state()), {
      selection: [0, 1], paths: [], actionCount: 2, tileCount: 2, cancelCount: 0,
    });
  });
});

test('extra fingers, pointer cancellation, and large drift cancel a press', async () => {
  await withHarness(async (page) => {
    await page.evaluate(() => {
      __touchTest.fire('pointerdown', 'action', 10);
      __touchTest.fire('pointerdown', 'tile0', 11, { isPrimary: false });
      __touchTest.fire('pointerup', 'action', 10);
      __touchTest.fire('pointerup', 'tile0', 11, { isPrimary: false });
    });
    assert.equal((await page.evaluate(() => __touchTest.state())).actionCount, 0);

    await page.evaluate(() => {
      __touchTest.fire('pointerdown', 'tile0', 12);
      __touchTest.fire('pointercancel', 'tile0', 12);
      __touchTest.fire('pointerup', 'tile0', 12);
      __touchTest.fire('pointerdown', 'action', 13);
      __touchTest.fire('pointermove', 'action', 13, { dy: -90 });
      __touchTest.fire('pointerup', 'action', 13, { dy: -90 });
    });
    const state = await page.evaluate(() => __touchTest.state());
    assert.deepEqual(state.selection, []);
    assert.equal(state.actionCount, 0);
  });
});

test('swipe uses distinct duplicate tiles, backtracks, and waits for Submit', async () => {
  await withHarness(async (page) => {
    await page.evaluate(() => {
      __touchTest.setMode('swipe');
      __touchTest.setSelection([2]);
      __touchTest.fire('pointerdown', 'tile0', 20);
      __touchTest.fire('pointermove', 'tile1', 20);
      __touchTest.fire('pointermove', 'tile0', 20);
      __touchTest.fire('pointermove', 'tile1', 20);
      __touchTest.fire('pointerup', 'tile1', 20);
      __touchTest.nativeClick('tile0');
    });
    const state = await page.evaluate(() => __touchTest.state());
    assert.deepEqual(state.selection, [0, 1]);
    assert.deepEqual(state.paths, [[0], [0, 1], [0], [0, 1], [0, 1]]);
    assert.equal(state.tileCount, 0);
    assert.equal(state.actionCount, 0);
  });
});

test('a cancelled swipe cannot restore a previous puzzle selection on release', async () => {
  await withHarness(async (page) => {
    await page.evaluate(() => {
      __touchTest.setMode('swipe');
      __touchTest.setSelection([2]);
      __touchTest.fire('pointerdown', 'tile0', 30);
      __touchTest.setEpoch(1);
      __touchTest.cancel();
      __touchTest.setSelection([]);
      __touchTest.fire('pointerup', 'tile0', 30);
    });
    assert.deepEqual((await page.evaluate(() => __touchTest.state())).selection, []);
  });
});

test('a changed gesture context on release cancels without an exception', async () => {
  await withHarness(async (page) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.evaluate(() => {
      __touchTest.setMode('swipe');
      __touchTest.setSelection([2]);
      __touchTest.fire('pointerdown', 'tile0', 31);
      __touchTest.setEpoch(1);
      __touchTest.setSelection([]);
      __touchTest.fire('pointerup', 'tile0', 31);
    });
    assert.deepEqual(errors, []);
    assert.deepEqual((await page.evaluate(() => __touchTest.state())).selection, []);
  });
});

async function withApp(run) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.goto(url);
    await page.locator('#letters .letter').first().waitFor();
    await run(page);
  } finally {
    await page.close();
  }
}

async function chooseSwipeMode(page) {
  await page.locator('#menu-button').click();
  await page.locator('#menu-dialog input[name="input-mode"][value="swipe"]').check({ force: true });
  await page.locator('#menu-dialog button[data-close]').click();
}

test('the live app keeps a swiped word for review until Submit', async () => {
  await withApp(async (page) => {
    await chooseSwipeMode(page);
    await page.evaluate(() => {
      const button = (letter) => [...document.querySelectorAll('#letters .letter')]
        .find((entry) => entry.dataset.letter === letter);
      window.__gamePointer = (type, letter, id) => {
        const target = button(letter), rect = target.getBoundingClientRect();
        const event = new PointerEvent(type, {
          bubbles: true, cancelable: true, pointerId: id, pointerType: 'touch', isPrimary: true,
          clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2,
        });
        (type === 'pointerdown' ? target : document).dispatchEvent(event);
      };
      __gamePointer('pointerdown', 'C', 80);
      __gamePointer('pointermove', 'A', 80);
      __gamePointer('pointermove', 'R', 80);
      __gamePointer('pointermove', 'E', 80);
      __gamePointer('pointerup', 'E', 80);
      button('C').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
    });
    assert.equal(await page.locator('#word-preview').textContent(), 'CARE');
    assert.equal(await page.locator('#grid .is-revealed').count(), 0);
    assert.equal(await page.locator('#submit-button').isEnabled(), true);
    await page.locator('#submit-button').click();
    assert.equal(await page.locator('#word-preview').textContent(), '');
    assert.ok((await page.locator('#grid .is-revealed').count()) > 0);
    assert.equal(await page.locator('#wheel').evaluate((element) => getComputedStyle(element).touchAction), 'pinch-zoom');
    assert.equal(await page.locator('#letters .letter').first().evaluate((element) => getComputedStyle(element).touchAction), 'pinch-zoom');
  });
});

test('changing puzzle during a swipe does not restore the old preview', async () => {
  await withApp(async (page) => {
    await chooseSwipeMode(page);
    await page.evaluate(() => {
      const letter = (value) => [...document.querySelectorAll('#letters .letter')]
        .find((entry) => entry.dataset.letter === value);
      const pointer = (type, value) => {
        const target = letter(value), rect = target.getBoundingClientRect();
        const event = new PointerEvent(type, {
          bubbles: true, cancelable: true, pointerId: 90, pointerType: 'touch', isPrimary: true,
          clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2,
        });
        (type === 'pointerdown' ? target : document).dispatchEvent(event);
      };
      pointer('pointerdown', 'C');
      pointer('pointermove', 'A');
      document.querySelector('#menu-button').click();
    });
    await page.evaluate(() => document.dispatchEvent(new PointerEvent('pointerup', {
      bubbles: true, cancelable: true, pointerId: 90, pointerType: 'touch', isPrimary: true,
    })));
    await page.locator('#menu-dialog input[name="difficulty"][value="steady"]').check({ force: true });
    assert.match(await page.locator('#puzzle-label').textContent(), /Steady/);
    assert.equal(await page.locator('#word-preview').textContent(), '');
  });
});

test('a native Chromium touch tap adds one letter', async () => {
  const touchBrowser = await chromium.launch();
  try {
    const page = await touchBrowser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    await page.goto(url);
    const tile = page.locator('#letters .letter').first();
    await tile.waitFor();
    const letter = await tile.getAttribute('data-letter');
    const rect = await tile.boundingBox();
    await page.touchscreen.tap(rect.x + rect.width / 2, rect.y + rect.height / 2);
    assert.equal(await page.locator('#word-preview').textContent(), letter);
  } finally {
    await touchBrowser.close();
  }
});

test('Enter on a focused Clear button clears a three-letter preview once', async () => {
  await withApp(async (page) => {
    await page.keyboard.type('CAR');
    assert.equal(await page.locator('#word-preview').textContent(), 'CAR');
    await page.locator('#clear-button').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#word-preview').textContent(), '');
    assert.equal(await page.locator('#grid .is-revealed').count(), 0);
  });
});
