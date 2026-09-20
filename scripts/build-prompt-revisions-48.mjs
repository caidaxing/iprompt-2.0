import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const sourcePath = path.join(root, "data", "cases-gpt-image-2.json");
const outputPath = path.join(root, "data", "cases-prompt-revisions-48.json");

// 每个场景 3 张主推 + 1 张备用。这里只写逐案例的原创化调整，不添加全局风格参数。
const groups = [
  {
    type: "商品广告",
    cases: [
      [33, "main", "Keep the product category and commercial purpose. Shift to a slightly elevated three-quarter camera angle, place the product off-center, and add one restrained context prop related to its use. Avoid repeating the source composition."],
      [178, "main", "Reframe the marketplace detail page as a clearer three-part product story: hero view, close-up feature, and usage detail. Vary the product angle, spacing, and callout placement while keeping the information readable."],
      [190, "main", "Show the coffee machine on a tidy lived-in morning counter, with a subtle cup and a small trace of steam. Use a lower camera position and soft side light; keep the machine as the sole visual hero."],
      [237, "backup", "Keep the summer citrus soda advertising purpose, but use a diagonal top-down arrangement with condensation, sliced citrus, and one deliberate area of negative space. Do not reuse the original packshot layout."]
    ]
  },
  {
    type: "社交媒体",
    cases: [
      [2, "main", "Create a new social-post screenshot hierarchy with a fictional creator account, a shorter post body, and a different arrangement of the attached promotional visual. Do not reproduce real account identity, exact metrics, or the source layout."],
      [21, "main", "Place the livestream interface inside a vertical mobile frame with a different host pose, a calmer comment rhythm, and a redesigned lower action bar. Preserve the recognizable livestream use case without copying the original screen."],
      [260, "main", "Rebuild the social feed with a different profile header, card order, and interaction row. Keep the content-publishing context and readable interface structure, but change the visual hierarchy and spacing."],
      [335, "backup", "Turn the idea into a fictional messaging-thread screenshot with a different conversation flow, timestamp rhythm, and message grouping. Keep the screenshot believable and avoid using the exact original copy or arrangement."]
    ]
  },
  {
    type: "品牌视觉",
    cases: [
      [136, "main", "Develop a distinct brand identity presentation with a new logo geometry, a different lockup arrangement, and two practical touchpoints. Keep the identity-system purpose while avoiding the source mark and exact board composition."],
      [342, "main", "Show the seasonal packaging campaign through a new grid rhythm and a different set of pack angles. Keep the campaign system coherent, but vary the package hierarchy, supporting props, and negative space."],
      [362, "main", "Present the matcha brand touchpoint system as a new editorial board: vary the placement of packaging, printed collateral, and digital touchpoints while preserving the brand-world exploration goal."],
      [160, "backup", "Design a new brand mascot direction with a different silhouette, pose set, and application example. Keep the mascot approachable and brand-ready, but do not reproduce the source character design."]
    ]
  },
  {
    type: "海报排版",
    cases: [
      [9, "main", "Keep the city-series poster purpose, but use a new city-specific visual metaphor, a different figure-to-landmark relationship, and a more asymmetric type block. Preserve clear typography without copying the original composition."],
      [175, "main", "Create a new cover layout with a shifted focal image, a different title scale, and a quieter secondary information area. Keep the editorial cover function and readable hierarchy."],
      [253, "main", "Retain the seasonal festival-poster purpose, but change the main seasonal symbol, the perspective, and the placement of the date/title. Leave generous breathing room and avoid the reference layout."],
      [343, "backup", "Rework the fashion magazine cover as a different editorial cover story: change the crop, headline hierarchy, and supporting microtext placement while keeping a premium fashion-publication feel."]
    ]
  },
  {
    type: "UI界面",
    cases: [
      [7, "main", "Keep the mobile app mockup use case, but change the device angle, screen sequence, and surrounding context. Use a distinct interaction state and a different visual hierarchy while keeping the interface legible."],
      [177, "main", "Recompose the vehicle cockpit interface as a different dark dashboard state: change the control grouping, information emphasis, and camera perspective while preserving the automotive-screen purpose."],
      [387, "main", "Create a streaming-service home screen with a new content row structure, a different hero title treatment, and a changed thumbnail rhythm. Keep the recognizable browsing interaction without recreating the source screen."],
      [261, "backup", "Redesign the generative-video tool interface with a different panel hierarchy, prompt area, and preview state. Keep it as a credible creative software screen and avoid the original layout."]
    ]
  },
  {
    type: "信息图教育",
    cases: [
      [8, "main", "Keep the encyclopedia-card purpose, but reorganize the information into a new reading path with a different hero diagram, feature callouts, and score module. Preserve clarity and educational usefulness."],
      [222, "main", "Build a new modular science reference card with a different central subject view, supporting comparison blocks, and a new information order. Keep the content-rich but comfortable reading experience."],
      [544, "main", "Keep the preschool vocabulary-learning purpose, but change the object-part relationship, child gesture, panel proportions, and label placement. Use new fictional example words and do not copy the source card composition."],
      [334, "backup", "Explain the RAG system through a different pipeline arrangement, clearer input/output grouping, and a new set of example labels. Keep the technical teaching purpose and make the information hierarchy distinct."]
    ]
  },
  {
    type: "人像写真",
    cases: [
      [31, "main", "Keep the portrait-photography purpose, but change the subject pose, crop, light direction, and background relationship. Preserve natural skin and realistic camera language without recreating the source portrait."],
      [187, "main", "Create a new Korean-minimal portrait session with a different styling detail, three-quarter pose, and soft window-light direction. Keep the quiet fashion-editorial mood but vary the framing and set."],
      [219, "main", "Rebuild the nine-frame idol lookbook with a new grid rhythm, different micro-expressions, and varied portrait crops. Keep consistent identity across panels while changing the original panel order and poses."],
      [321, "backup", "Keep the urban sunset fashion-campaign purpose, but change the location, stance, lens height, and color contrast. Make the subject feel editorial and natural without repeating the source image arrangement."]
    ]
  },
  {
    type: "建筑空间",
    cases: [
      [211, "main", "Keep the architectural exploded-view purpose, but use a new cutaway direction, annotation grouping, and layer spacing. Preserve the building’s recognizable structure while avoiding the source diagram arrangement."],
      [381, "main", "Rebuild the 1990s apartment reference board with a different room angle, furniture grouping, and camera notes. Keep the production-design usefulness and period cues without copying the original board."],
      [411, "main", "Create a new minimalist landmark poster with a different building silhouette, typographic relationship, and crop. Keep the architecture-led poster function and readable design philosophy copy."],
      [489, "backup", "Keep the miniature city-travel poster idea, but change the city, vehicle route, map relationship, and focal perspective. Make the road emerge naturally from the map without reproducing the source composition."]
    ]
  },
  {
    type: "生活摄影",
    cases: [
      [28, "main", "Keep the realistic photography direction, but change the everyday subject, moment, lens distance, and light quality. Favor an observed, imperfect scene rather than repeating the original setup."],
      [221, "main", "Create a new window-side film photograph with a different time of day, seated pose, room detail, and reflection pattern. Keep the candid Japanese-film feeling while changing the composition."],
      [383, "main", "Keep the iPhone daily-life snapshot premise, but choose a different ordinary moment, framing, and foreground obstruction. Preserve casual authenticity and avoid recreating the source gesture or setting."],
      [414, "backup", "Reframe the morning interior photograph around a different domestic action, camera height, and light patch. Keep the quiet realistic atmosphere but change the room arrangement and subject placement."]
    ]
  },
  {
    type: "奇幻叙事",
    cases: [
      [224, "main", "Keep the abandoned-sea-city mecha narrative, but change the machine silhouette, weather event, character stance, and storytelling focal point. Preserve a clear cinematic scene without repeating the original arrangement."],
      [238, "main", "Retain the cosmic fish-and-small-person dialogue idea, but alter the scale relationship, light source, surrounding celestial forms, and emotional beat. Make the scene’s visual metaphor newly composed."],
      [392, "main", "Keep the miniature-city-inside-hair premise, but redesign the city type, viewpoint, and cause-and-effect relationship between hair and architecture. Preserve the surreal storytelling while changing the visual logic."],
      [537, "backup", "Keep the underground-archive introspection theme, but change the figure relationship, symbolic object, aisle geometry, and light direction. Retain the quiet psychological tension without copying the source metaphor."]
    ]
  },
  {
    type: "历史古风",
    cases: [
      [44, "main", "Keep the historical-period subject, but choose a different moment of action, viewpoint, costume detail, and surrounding setting. Preserve period atmosphere without reproducing the source scene."],
      [206, "main", "Recompose the classical figure scroll as a new horizontal narrative with a different character grouping, gesture rhythm, and landscape breaks. Keep the traditional-scroll purpose while changing the sequence."],
      [226, "main", "Create a new imperial-portrait panorama with a different lineup logic, architectural backdrop, and title placement. Preserve historical illustration clarity and avoid copying the original procession."],
      [337, "backup", "Keep the classical-poetry mood, but translate the poem into a different season, viewpoint, spatial depth, and symbolic object. Preserve the literary atmosphere without repeating the source image structure."]
    ]
  },
  {
    type: "实验艺术",
    cases: [
      [193, "main", "Keep the contemporary-worker transformation concept, but change the central gesture, surrounding workplace details, material treatment, and visual contrast. Preserve the conceptual humor without recreating the original image."],
      [281, "main", "Retain the cyber-mandala idea, but construct a different radial logic, symbol family, depth structure, and focal center. Keep the experimental artwork legible and avoid named-artist imitation."],
      [356, "main", "Keep the overthinking street-campaign premise, but change the public-space setting, visual metaphor, typography relationship, and figure placement. Preserve the campaign concept while making the composition new."],
      [409, "backup", "Keep the intentionally rough MS Paint redraw direction, but use a different subject crop, primitive shape vocabulary, color blocking, and awkward detail. Do not reproduce the original redraw or exact pixels."]
    ]
  }
];

const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const byNum = new Map(source.cases.map((item) => [item.num, item]));
const selected = groups.flatMap((group) => group.cases.map(([num, role, revision]) => {
  const original = byNum.get(num);
  if (!original) throw new Error(`Case ${num} not found in data/cases-gpt-image-2.json`);
  return {
    num,
    title: original.title,
    sceneType: group.type,
    role,
    image: original.image,
    originalCategory: original.category,
    source: original.source,
    originalPrompt: original.prompt,
    revision,
    revisedPrompt: `${original.prompt}\n\nOriginality adjustment for this regeneration:\n${revision}`,
  };
}));

if (selected.length !== 48 || new Set(selected.map((item) => item.num)).size !== 48) {
  throw new Error(`Expected 48 unique selected cases, got ${selected.length}`);
}

const output = {
  meta: {
    source: "data/cases-gpt-image-2.json",
    generatedAt: new Date().toISOString().slice(0, 10),
    total: selected.length,
    mainPerType: 3,
    backupPerType: 1,
    note: "Original prompts are preserved; revisedPrompt appends a case-specific variation only. No global style parameter is applied.",
  },
  groups: groups.map((group) => ({
    sceneType: group.type,
    total: group.cases.length,
    main: group.cases.filter(([, role]) => role === "main").map(([num]) => num),
    backup: group.cases.filter(([, role]) => role === "backup").map(([num]) => num),
  })),
  cases: selected,
};

fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`Wrote ${selected.length} prompt revisions to ${path.relative(root, outputPath)}`);
