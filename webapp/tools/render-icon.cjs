// Renders the 1024px app icon from the real 3D scene. Run after `npm run build`:
//   node tools/render-icon.cjs  (needs Playwright + Chromium)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1024, height: 1024 }, deviceScaleFactor: 1 });
  await p.goto(require('url').pathToFileURL(require('path').resolve(__dirname, '../../CubeTutor/web/index.html')).href);
  await p.waitForTimeout(1500);
  await p.addStyleTag({ content: '#app{display:none!important} body::after{display:none}' });
  await p.evaluate(() => {
    const v = window.__cube.view;
    window.__cube.show({ render: () => document.createElement('div') });
    v.idleSpin = false;
    v.setInsets(0, 0);
    v.cam.yaw = v.camTarget.yaw = 0.62; v.cam.pitch = v.camTarget.pitch = 0.5; v.cam.dist = v.camTarget.dist = 14.5; v.setState(v.model.constructor ? (()=>{const m=v.model; for(const c of m.cubies){c.pos=c.home.slice(); c.cols=[[1,0,0],[0,1,0],[0,0,1]];} return m;})() : v.model);
    v.ground.visible = false; v.updateFraming = () => { v.camera.fov = 25; v.camera.clearViewOffset(); v.camera.updateProjectionMatrix(); };
    // twist the top layer a little for a dynamic look
    for (const c of v.model.cubies) if (c.pos[1] === 1) v.pivot.attach(v.meshes.get(c.id));
    v.pivot.rotation.y = -0.42;
  });
  await p.waitForTimeout(3000);
  await p.evaluate(() => { const v = window.__cube.view; v.frame(); v.renderer.setAnimationLoop(null); v.frame(); });
  await p.waitForTimeout(500);
  await p.screenshot({ timeout: 120000, path: require('path').resolve(__dirname, '../../CubeTutor/Assets.xcassets/AppIcon.appiconset/icon-1024.png') });
  await b.close();
})();
