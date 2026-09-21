// 2.5 对比专区数据:同一提示词下的 GPT-Image 2 原图与 2.5 实测结果
// status: demo=界面示意(两侧同图) pending=原图已就位待实测 tested=已实测(result 必填)
// 实测完成后:把 status 改为 tested 并填 result(复现图/结论/参数表),与上游 awesome-gpt-image-2 的做法一致

export interface ComparisonParams {
  label: string;
  value: string;
}

export interface ComparisonResult {
  image: string;
  label: string;
  summary: string;
  modelNote: string;
  parameters: ComparisonParams[];
}

export interface ComparisonCase {
  id: string;
  caseNum: number | null; // 关联图库案例编号(null=示意条目)
  title: string;
  prompt: string;
  image: string;
  source: string;
  sourceUrl: string;
  focus: string;
  status: "demo" | "pending" | "tested";
  result?: ComparisonResult;
}

export const comparisonCases: ComparisonCase[] = [
  {
    id: "demo-side-by-side",
    caseNum: null,
    title: "界面示意 · 商品摄影",
    prompt: `米色陶瓷咖啡杯,放在原木桌面,柔和自然光从左侧进入,浅景深,商业产品摄影风格。`,
    image: "/images/template-covers/case28.jpg",
    source: "专区示意素材",
    sourceUrl: "",
    focus: "材质、光线、构图与指令遵循(两侧为同一示意图,仅演示对比交互)",
    status: "demo",
  },
  {
    id: "gallery-11",
    caseNum: 11,
    title: "一张手绘风格的城市美食地图，以台州为主题",
    prompt: `一张手绘风格的城市美食地图，以台州为主题。画面以鸟瞰视角的手绘简化城市地图为底，标注椒江、路桥、黄岩等区域和灵江、台州湾等水系地标，不追求精确比例而是追求可爱的水彩手绘感。地图上分布着12个美食地点的精致手绘小插画：1. 椒江老粮坊的蛋清羊尾（金黄蓬松的蛋泡甜点撒着糖粉，筷子夹起拉丝）2. 临海紫阳古街的食饼筒（一个饱满的麦饼卷切开露出肉丝、蛋皮、米面等丰富馅料）3. 三门的青蟹（一只肥硕的青壳大蟹张着大钳子，旁边一小碟姜醋）4. 温岭石塘渔港的海鲜面（粗瓷大碗浓白鱼汤面铺满虾、蛏子、小黄鱼）5. 路桥的糟羹（一锅稠厚的五彩羹，芥菜、冬笋、香干、牡蛎粒粒可见）6. 玉环坎门的炊圆（三四个白胖糯米团子卧在笼屉里，旁边酱油碟滴着麻油）7. 黄岩的麦虾（陶锅里面疙瘩配蛤蜊、青菜翻滚冒泡）8. 仙居的八大碗（八只粗陶小碗围成一圈——土鸡、溪鱼、豆腐皮俱全）9. 天台的饺饼筒（几卷金黄酥脆的薄饼整齐码放，露出红烧肉和豆面馅）10. 临海的麦油脂（竹盘上摊着薄如蝉翼的饼皮卷着肉末、豆芽、鸡蛋丝）11. 温岭的嵌糕（厚实的年糕饼中间嵌着红烧肉和油条，正在铁板上滋滋作响）12. 椒江的姜汁调蛋（一只青花碗里琥珀色姜汤卧着嫩滑蛋花，撒几粒核桃碎）。每个插画约占地图5%面积，旁边用手写体标注店名和一句推荐语如“阿婆凌晨四点就起来和面”“本地人认准这口锅”。地图边缘用手绘藤蔓、杨梅枝和小海鲜（虾、蟹、贝壳）装饰形成边框。右下角有一个手绘指南针（标注“东海”方向）和图例说明。左上角标题“台州·山海食光地图”使用胖圆的手绘美术字，用杨梅和小黄鱼点缀装饰。整体画风为水彩+彩铅混合的手绘质感，颜色以杨梅红、姜黄、海蓝、翠绿为主，图片比例1:1。`,
    image: "/images/template-covers/case11.jpg",
    source: "小红书号510244722",
    sourceUrl: "",
    focus: "手绘线条风格、地图版式结构、店铺标记与中文文字可读性",
    status: "pending",
  },
  {
    id: "gallery-14",
    caseNum: 14,
    title: "信息图可视化设计",
    prompt: `视觉设计规格描述：画幅比 9:16（竖版手机信息图）；背景纹理为具有呼吸感的米色手工纸（Handmade Washi Paper），带微小纤维纹理，边角有轻微水渍晕染；配色方案为熟番茄红（#E23A28）、初榨橄榄油金黄（#F2C94C）、嫩草绿（#6FCF97）、碳黑墨线；排版逻辑为顶端大标题、中间 Z 字形流线、底部全景成品、留白艺术化处理。食谱内容策划：1）顶部标题《番茄炒蛋：国民灵魂料理》，手绘书法体，侧边盖红色“厨师推荐”微型印章。2）步骤区块（Z 动线排版）：步骤1 挑选与备菜（左上）：三个番茄、四枚土鸡蛋、一簇葱花；说明：番茄切小块，鸡蛋打散均匀；厨师秘技：番茄去皮后切块，汁水更浓郁，口感更丝滑；心得：选熟透番茄，成功一半。步骤2 蛋液的魔法（右上）：手持筷子快速搅动蛋液，泛起气泡与动感线；说明：加少许盐和几滴温水；厨师秘技：加温水或白醋，鸡蛋更蓬松；心得：搅打充分，空气是蓬松秘密。步骤3 烈火蓬松蛋（左中）：铁锅中蛋液迅速膨胀如云朵，水彩表现热气；说明：油热下锅，快速划散，八成熟盛出；厨师秘技：油温高，烟起即入，瞬间锁水；心得：宁可稍嫩，不可过老。步骤4 番茄出浓汁（右中）：番茄翻滚，边缘半融化，亮红汤汁流淌；说明：煸炒至出汁，加少许糖和盐；厨师秘技：铲子轻压加速出汁，可加一勺番茄酱提色；心得：糖中和酸度、提鲜。步骤5 最后的合奏（左下）：鸡蛋回锅与番茄汁交织，撒葱花；说明：让鸡蛋吸饱番茄汁，关火装盘；厨师秘技：出锅前滴几滴芝麻油提香；心得：动作要快，保持鲜亮色泽。3）底部成品插图：青花边陶瓷深盘装满番茄炒蛋，红亮汁水包裹金黄大块鸡蛋，葱花点缀，水彩渲染半透明酱汁质感，边缘有袅袅热气；视觉感：看了就想立刻盛一碗大米饭。4）底部中央署名：[ 摄影师的厨房日记 · 2025 ]。`,
    image: "/images/template-covers/case14.jpg",
    source: "小红书号Roy_Jay",
    sourceUrl: "",
    focus: "信息层级、图标风格一致性、配色系统与中文字体渲染",
    status: "pending",
  },
  {
    id: "gallery-22",
    caseNum: 22,
    title: "插画艺术风格创作",
    prompt: `An anime-style illustration of a {argument name="action type" default="high-impact martial arts battle"} between two young female fighters in a {argument name="setting" default="traditional wooden martial arts dojo"}. In the foreground, a girl with black hair in a high bun wears a {argument name="character 1 color theme" default="red and white"} Chinese-style martial arts outfit with baggy pants. She is in a dynamic, low, forward-thrusting stance, surrounded by swirling red energy and water splashes. In the background to the right, a girl with light purple hair in twin buns wears a {argument name="character 2 color theme" default="green and purple"} Chinese dress with gold embroidery and black tights. She is leaping through the air in a flying kick pose, surrounded by swirling blue energy. The wooden floorboards are splintering from the intense impact, with debris and dust flying through the air. Above them hangs a weathered wooden sign with the text "{argument name="sign text" default="武術会"}". The scene features dramatic lighting, a low-angle dynamic perspective, and intense action effects.`,
    image: "/images/template-covers/case22.jpg",
    source: "[@Tanemomi_Ver2](https://x.com/Tanemomi_Ver2)",
    sourceUrl: "",
    focus: "色彩情绪、笔触质感、人物与场景的比例关系",
    status: "pending",
  },
  {
    id: "gallery-28",
    caseNum: 28,
    title: "写实摄影风格创作",
    prompt: `{
  "type": "2x2 portrait grid",
  "subject": "{argument name=\\"subject description\\" default=\\"young adult East Asian male with short black hair and a slight smile\\"}",
  "style": "photorealistic, high-resolution, professional lighting, consistent facial identity across all panels",
  "layout": {
    "format": "2x2 grid",
    "panel_count": 4,
    "panels": [
      {
        "position": "top-left",
        "description": "{argument name=\\"profession 1\\" default=\\"Corporate professional wearing a dark navy suit, white shirt, and blue tie against a gray textured background\\"}"
      },
      {
        "position": "top-right",
        "description": "{argument name=\\"profession 2\\" default=\\"Casual attire wearing a dark blue crew neck t-shirt against a blurred outdoor park background\\"}"
      },
      {
        "position": "bottom-left",
        "description": "{argument name=\\"profession 3\\" default=\\"Construction worker wearing a yellow hard hat, navy blue work shirt, and bright orange high-visibility vest against a blurred warehouse background\\"}"
      },
      {
        "position": "bottom-right",
        "description": "{argument name=\\"profession 4\\" default=\\"Medical professional wearing a white lab coat over a light blue collared shirt against a blurred laboratory background\\"}"
      }
    ]
  }
}`,
    image: "/images/template-covers/case28.jpg",
    source: "[@frankfu1688](https://x.com/frankfu1688)",
    sourceUrl: "",
    focus: "照片真实感、光影方向、景深处理与细节质感",
    status: "pending",
  },
];
