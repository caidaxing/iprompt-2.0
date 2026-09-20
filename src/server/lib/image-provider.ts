// 生图 Provider 抽象:mock 本地出图(默认,零依赖零成本),远程供应商预留插槽
// 参照 canghe.ai 的 apimart 网关思路——链路先通,换实现零改动
import { createHash } from "node:crypto";

export interface GeneratedImage {
  buffer: Buffer;
  provider: string;
}

export interface ImageProvider {
  readonly name: string;
  generate(prompt: string): Promise<GeneratedImage>;
}

/** 转义 XML 特殊字符(SVG 文本节点用) */
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** 按提示词哈希取一个稳定的调色板色(同一提示词出同一风格,便于对比占位符改动) */
const PALETTE = [
  ["#F7F4EE", "#1A1A18", "#C9C2B2"], // 宣纸墨黑
  ["#1B3A4B", "#E8E3D5", "#7FA8A0"], // 黛蓝
  ["#3D2B1F", "#F1E5D0", "#C89F6E"], // 赭石
  ["#274035", "#EAF0E7", "#9DBEA4"], // 松绿
  ["#402A3C", "#F5EDF2", "#C29AB4"], // 紫檀
];

/**
 * Mock 供应商:生成确定性 SVG 海报(提示词摘要 + 哈希指纹)。
 * 仅用于打通产品链路与本地/测试环境;接真实模型 API 时新增实现并在 env 切换。
 */
export class MockImageProvider implements ImageProvider {
  readonly name = "mock";

  async generate(prompt: string): Promise<GeneratedImage> {
    const hash = createHash("sha256").update(prompt).digest("hex");
    const [bg, fg, accent] = PALETTE[parseInt(hash.slice(0, 2), 16) % PALETTE.length];
    const words = prompt.replace(/\s+/g, " ").trim().split(" ").slice(0, 14);
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      if ((cur + " " + w).trim().length > 38) {
        lines.push(cur.trim());
        cur = w;
      } else cur += " " + w;
    }
    if (cur.trim()) lines.push(cur.trim());
    const textSvg = lines
      .slice(0, 6)
      .map((l, i) => `<text x="72" y="${300 + i * 56}" font-size="30" fill="${fg}" font-family="serif">${esc(l)}</text>`)
      .join("\n  ");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="${bg}"/>
  <rect x="48" y="48" width="928" height="928" fill="none" stroke="${accent}" stroke-width="3"/>
  <circle cx="880" cy="140" r="46" fill="${accent}"/>
  ${textSvg}
  <text x="72" y="920" font-size="20" fill="${fg}" opacity="0.65" font-family="monospace">iPrompt Studio · mock · ${hash.slice(0, 12)}</text>
</svg>`;
    return { buffer: Buffer.from(svg, "utf8"), provider: this.name };
  }
}

/** 按环境配置产出 Provider;未支持的取值启动即报错(与 env 校验同一哲学) */
export function getImageProvider(name: string): ImageProvider {
  if (name === "mock") return new MockImageProvider();
  throw new Error(`未实现的 IMAGE_PROVIDER:${name}(远程供应商将在后续版本提供)`);
}
