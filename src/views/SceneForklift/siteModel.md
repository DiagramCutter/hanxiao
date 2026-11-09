# 场景二模型

当前使用 `public/models/hcangdi2-compressed.glb`，来自建模师的 `hcangdi2.glb`。
原文件约 37.51 MB，压缩版约 8.27 MB。未使用 simplify 减面、合并节点或降低贴图分辨率，281 个节点和 22 张贴图均保留。

建模师确认这版主要调整设施布局，没有新增绿植。`ForkliftModel.vue` 继续加载 `siteEnvironment.ts` 的前端示意树木、外围绿地和道路，默认开启，可通过“绿化”按钮切换。这层环境独立于 GLB，使用相同的场地坐标和居中偏移。

## 重新生成压缩副本

下面的命令在项目根目录执行，输入路径改成新的原始文件位置。中间文件放在 `.vite/`，不要提交；不要覆盖原文件。

```powershell
New-Item -ItemType Directory -Path '.vite' -Force
node scripts/prepare-site-model.mjs '原始文件路径/hcangdi2.glb' '.vite/hcangdi2-prepared.glb'
pnpm dlx @gltf-transform/cli@4.5.0 webp '.vite/hcangdi2-prepared.glb' '.vite/hcangdi2-textures.glb' --quality 90 --effort 80
pnpm dlx @gltf-transform/cli@4.5.0 draco '.vite/hcangdi2-textures.glb' 'public/models/hcangdi2-compressed.glb' --quantize-position 16 --quantize-normal 12 --quantize-texcoord 14
```

先处理贴图，再做 Draco，避免图像命令解码已经压缩的几何。更新资源后同步修改加载 URL 的版本参数。

`prepare-site-model.mjs` 只处理这版模型已核实的导出问题：

- 非金属表面的 `metallicFactor` 设为 0，限制超范围的高光颜色。
- 7 处标线缺少 UV；其原贴图已核实为纯白或纯黄，改成相同颜色的独立材质，不改变其它使用贴图的网格。

## 坐标与显示

导出模型整体有位移和旋转。加载时使用原场地节点 `231` 的世界矩阵逆变换，恢复原业务坐标系。
黄色九槽的边界仍与 `machinePlacement.ts` 中坐标一致。不要在压缩时删除或合并这个基准节点。
场地中心固定采用旧压缩模型的标定值 `[12.353393, -0.032455, 0.000004]`，避免布局调整改变包围盒后影响设备离地高度。材料堆场、钢筋加工区和现场配套区标签已按新布局移动。

换成其它版本模型时，要重新检查基准节点、槽孔边界、设备高度、区域标签及材质；不要直接套用这版模型的纯色修复规则。
