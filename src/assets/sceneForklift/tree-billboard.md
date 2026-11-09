# 场景二外围树木贴图

- 文件：`tree-billboard.png`，透明 PNG。
- 生成方式：内置 `image_gen` 工具，2026-10-16。
- 用途：固定镜头场景的外围绿化示意；由 `siteEnvironment.ts` 以共享纹理的 Sprite 渲染，不代表真实现场的树木分布。
- 原始场地 GLB 未作修改。草地、道路、树木可通过页面右上方“绿化”按钮统一开关。

## 生成提示词

Use case: product-mockup. Asset type: a single transparent tree billboard texture for a fixed-camera 3D engineering construction-site visualization. Create exactly ONE realistic mature medium-height leafy deciduous broadleaf tree, entire tree including trunk base, no cropping, centered with a narrow transparent margin. View from an elevated camera looking down at approximately 38 degrees, so the canopy top is clearly visible and the short trunk is visible below. Realistic small irregular leaves and organically clustered crown, broad oval canopy, muted natural olive and forest green, detailed soft sunlit upper foliage with shaded deep green underside. Tree height approximately 5 meters, crown width 3.5 meters, short slender brown trunk with subtle branches. Soft neutral daylight from upper left. Architectural visualization photo-realism, not cartoon, not low-poly. Transparent background, no ground, no grass, no scenery, no other trees, no base, no text, no watermark, no checkerboard baked into the image. Return the tree as a clean alpha cutout for use directly in a Three.js sprite material. Need physically realistic foliage, softly irregular silhouette, avoid perfectly spherical shape.
