# 原创美术记录

## 方向

奶油白、鼠尾草绿、暖黄色；柔和立体玩具牧场。牌面使用有区别的剪影与色彩，遮挡层降低亮度与饱和度；正文保持清楚，装饰留在棋盘外围。

工具：内置 `image_gen.imagegen`，非CLI。全新生成，无输入参考图。原始素材已保存在项目中；WebP仅为网页体积优化的格式转换。

## 文件

- `art-source/meadow.png`：原始背景。
- `art-source/farm-icons.png`：原始4列3行透明牌面图集。
- `public/assets/meadow.webp`：网页背景，251330字节。
- `public/assets/farm-icons.webp`：网页图集，310440字节。
- `src/icons.ts`：原创SVG角色与线性辅助图标。

## 背景生成提示词

Create a production background illustration asset for an ORIGINAL premium cozy sheep farm tile puzzle browser game. Landscape 1536x1024. Soft tactile 3D clay diorama, art-directed miniature world, warm creamy sunlit ivory sky, muted sage green rolling meadows, rich olive grass tufts, small soft yellow wildflowers, graceful pale wood fence, a tiny terracotta-roof cream farmhouse toward far LEFT, rounded lollipop trees framing the outer edges, distant hazy hills, beautiful soft ambient shadows and bounced light, subtle paper-grain tactile finish, absolutely charming and refined. Three small original fluffy cream sheep grazing near bottom left and bottom right, round bodies, caramel beige faces and stubby feet, tiny black bead eyes. Composition: large calm open light sage meadow across CENTER and RIGHT to sit beneath a UI, keep upper right and central half uncluttered and pale. Landscape at a very shallow isometric angle, atmospheric depth. NO text, NO letters, NO logos, NO interface, NO tiles, NO watermarks. Entire image fully opaque. Color palette ivory #fff9e9, sage #dce9bd, forest #315540, butter #f2cd75. Render polished high-quality game key art, consistent toy-like character style.

## 牌面生成提示词

Production sprite atlas for an original premium cozy farm tile matching puzzle game. One square 1024x1024 TRANSPARENT PNG, no background. EXACTLY TWELVE separate softly sculpted 3D clay game icons arranged in a PERFECTLY EVEN 4 columns by 3 rows grid, each icon centered in its own equally sized cell (cell width=25% canvas, cell height=33.333% canvas); each icon fills about 65% cell width, lots of empty transparent margin, absolutely no overlap. All icons share warm diffuse upper-left light, beautiful soft clay matte materials, sophisticated creamy pastel colors, rounded lovable forms, readable silhouettes, subtle tiny shadows contained within icon. Row1 LEFT TO RIGHT: a ripe red strawberry with green leaves, two orange carrots with leaves, golden corn cob in green husk, creamy beige mushroom with brown cap. Row2 LEFT TO RIGHT: round orange pumpkin with sage leaf, bright red apple with a tiny leaf, a bundle of golden wheat tied with a ribbon, soft light green broccoli. Row3 LEFT TO RIGHT: cheerful yellow sunflower with large brown center, soft green four-leaf clover, cute brown acorn with a cap, ivory wool yarn ball with a curled yarn tail. NO tiles beneath them, NO card borders, NO frame, NO grid lines, NO captions, NO text, NO numbers, NO logos, NO watermark. This must be a carefully aligned sprite sheet with exactly 4 items per row and 3 rows, transparent background, polished mobile game asset quality.

图像生成工具实际输出的图集为4:3，12个单元格接近正方形；CSS按实际4×3网格取图，未依赖提示词中的尺寸假设。原图已目视检查，网页截图也检查了图集定位与图案识别。
