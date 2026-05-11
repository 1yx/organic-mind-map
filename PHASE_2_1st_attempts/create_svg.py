from pathlib import Path
import textwrap

svg = r'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="1600" height="1000" viewBox="0 0 1600 1000" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .branch { fill:none; stroke:#FF00FF; stroke-linecap:round; stroke-linejoin:round; }
      .accent { fill:none; stroke:#00FFFF; stroke-linecap:round; stroke-linejoin:round; }
      .txt { fill:#00FF00; font-family:"PingFang SC","Noto Sans CJK SC","Microsoft YaHei",Arial,sans-serif; font-weight:700; }
      .label { font-size:34px; }
      .child { font-size:28px; }
      .title { font-size:44px; }
      .center { font-size:40px; }
      .iconStroke { stroke:#222; stroke-width:4; stroke-linecap:round; stroke-linejoin:round; fill:none; }
      .thin { stroke-width:3; }
    </style>
  </defs>

  <!-- transparent background intentionally omitted -->

  <!-- title -->
  <text x="800" y="76" text-anchor="middle" class="txt title">How Anthropic&apos;s Product Team Moves</text>

  <!-- main branches: pure magenta only -->
  <path class="branch" stroke-width="34" d="M750 470 C620 410, 520 330, 410 250 C340 195, 250 180, 160 180"/>
  <path class="branch" stroke-width="26" d="M405 252 C350 250, 300 240, 250 235"/>
  <path class="branch" stroke-width="24" d="M382 280 C330 310, 286 320, 220 318"/>

  <path class="branch" stroke-width="34" d="M815 448 C895 330, 980 245, 1120 225 C1240 208, 1320 210, 1440 205"/>
  <path class="branch" stroke-width="24" d="M1108 230 C1160 190, 1216 172, 1286 158"/>
  <path class="branch" stroke-width="24" d="M1112 232 C1185 270, 1245 285, 1325 295"/>

  <path class="branch" stroke-width="34" d="M870 500 C1000 505, 1110 510, 1235 500 C1340 492, 1425 470, 1500 450"/>
  <path class="branch" stroke-width="24" d="M1235 500 C1296 465, 1350 442, 1420 430"/>
  <path class="branch" stroke-width="24" d="M1238 506 C1300 555, 1350 574, 1435 582"/>

  <path class="branch" stroke-width="34" d="M770 558 C655 570, 535 590, 410 620 C310 645, 230 665, 120 650"/>
  <path class="branch" stroke-width="24" d="M410 620 C340 585, 270 565, 200 545"/>
  <path class="branch" stroke-width="24" d="M405 622 C335 668, 275 710, 185 755"/>

  <path class="branch" stroke-width="34" d="M784 585 C690 675, 610 740, 500 800 C400 852, 290 870, 150 860"/>
  <path class="branch" stroke-width="24" d="M505 798 C435 790, 380 774, 320 750"/>
  <path class="branch" stroke-width="24" d="M495 805 C410 850, 335 895, 240 920"/>

  <path class="branch" stroke-width="34" d="M832 585 C900 705, 995 780, 1120 812 C1235 840, 1340 830, 1470 800"/>
  <path class="branch" stroke-width="24" d="M1120 812 C1185 780, 1235 755, 1305 740"/>
  <path class="branch" stroke-width="24" d="M1122 816 C1190 855, 1240 878, 1325 895"/>

  <!-- cyan accents only on branch edges -->
  <path class="accent" stroke-width="10" d="M628 410 C570 375, 520 330, 455 280"/>
  <path class="accent" stroke-width="9" d="M910 320 C980 270, 1048 240, 1125 228"/>
  <path class="accent" stroke-width="9" d="M996 508 C1080 515, 1160 512, 1234 502"/>
  <path class="accent" stroke-width="9" d="M612 585 C538 596, 475 610, 410 626"/>
  <path class="accent" stroke-width="9" d="M650 715 C595 760, 550 785, 500 803"/>
  <path class="accent" stroke-width="9" d="M904 700 C960 760, 1030 795, 1120 812"/>

  <!-- center card -->
  <rect x="600" y="420" width="400" height="160" rx="18" fill="#F6D94A" stroke="#222" stroke-width="5"/>
  <line x1="614" y1="436" x2="986" y2="428" stroke="#B9922B" stroke-width="3" stroke-linecap="round"/>
  <text x="800" y="500" text-anchor="middle" class="txt center">Anthropic 产品之道</text>

  <!-- main labels -->
  <text x="480" y="245" text-anchor="middle" class="txt label">极速交付</text>
  <text x="940" y="205" text-anchor="middle" class="txt label">PM 角色</text>
  <text x="1125" y="490" text-anchor="middle" class="txt label">产品矩阵</text>
  <text x="360" y="605" text-anchor="middle" class="txt label">使命聚焦</text>
  <text x="455" y="790" text-anchor="middle" class="txt label">团队文化</text>
  <text x="1080" y="800" text-anchor="middle" class="txt label">AI 实践</text>

  <!-- child labels -->
  <text x="142" y="150" text-anchor="middle" class="txt child">研究预览</text>
  <text x="166" y="370" text-anchor="middle" class="txt child">跨职能</text>

  <text x="1302" y="145" text-anchor="middle" class="txt child">产品品味</text>
  <text x="1348" y="335" text-anchor="middle" class="txt child">角色融合</text>

  <text x="1460" y="405" text-anchor="middle" class="txt child">CLI·Desktop</text>
  <text x="1450" y="635" text-anchor="middle" class="txt child">Mobile</text>

  <text x="126" y="520" text-anchor="middle" class="txt child">安全AGI</text>
  <text x="168" y="808" text-anchor="middle" class="txt child">组织优先</text>

  <text x="270" y="735" text-anchor="middle" class="txt child">偏向行动</text>
  <text x="225" y="960" text-anchor="middle" class="txt child">移除旧功能</text>

  <text x="1348" y="720" text-anchor="middle" class="txt child">自动化</text>
  <text x="1376" y="940" text-anchor="middle" class="txt child">EVALS</text>

  <!-- illustrations: muted natural colors, no #FF00FF #00FFFF #00FF00 -->
  <!-- 研究预览 -->
  <g transform="translate(60,70)">
    <rect x="0" y="0" width="105" height="72" rx="6" fill="#E8EDF0" stroke="#222" stroke-width="4"/>
    <polyline points="14,50 36,36 55,44 75,20 92,30" class="iconStroke thin"/>
    <circle cx="126" cy="55" r="27" fill="#B8C7C9" stroke="#222" stroke-width="4"/>
    <line x1="146" y1="75" x2="180" y2="108" class="iconStroke"/>
  </g>

  <!-- 跨职能 -->
  <g transform="translate(70,260)">
    <circle cx="28" cy="30" r="20" fill="#F0C7A7" stroke="#222" stroke-width="3"/>
    <circle cx="88" cy="25" r="22" fill="#E8B995" stroke="#222" stroke-width="3"/>
    <circle cx="150" cy="32" r="19" fill="#F1C9A5" stroke="#222" stroke-width="3"/>
    <path d="M5 84 C12 52,44 52,54 84" fill="#C7A56B" stroke="#222" stroke-width="3"/>
    <path d="M62 84 C68 50,108 50,116 84" fill="#8EA6BD" stroke="#222" stroke-width="3"/>
    <path d="M128 84 C134 54,166 54,174 84" fill="#CBB6D9" stroke="#222" stroke-width="3"/>
    <rect x="8" y="100" width="40" height="30" rx="14" fill="#EFEFEF" stroke="#222" stroke-width="3"/>
    <text x="28" y="122" text-anchor="middle" font-size="20" fill="#222" font-family="Arial">⚙</text>
    <rect x="70" y="100" width="40" height="30" rx="14" fill="#EFEFEF" stroke="#222" stroke-width="3"/>
    <text x="90" y="122" text-anchor="middle" font-size="18" fill="#222" font-family="Arial">&lt;/&gt;</text>
    <rect x="132" y="100" width="40" height="30" rx="14" fill="#EFEFEF" stroke="#222" stroke-width="3"/>
    <rect x="142" y="115" width="6" height="10" fill="#7B8D42"/>
    <rect x="154" y="108" width="6" height="17" fill="#B88742"/>
  </g>

  <!-- 产品品味 -->
  <g transform="translate(1240,78)">
    <circle cx="42" cy="58" r="25" fill="#F0C0A0" stroke="#222" stroke-width="3"/>
    <path d="M20 48 C30 20,70 28,66 52" fill="#32383D" stroke="#222" stroke-width="3"/>
    <path d="M22 108 C34 78,62 78,76 108" fill="#8BA0B6" stroke="#222" stroke-width="3"/>
    <path d="M58 62 C70 74,70 90,56 98" class="iconStroke thin"/>
    <path d="M104 18 C132 -5,172 8,174 42 C174 74,138 78,118 60" fill="#F9F9F9" stroke="#222" stroke-width="3"/>
    <polygon points="142,20 164,36 148,60 126,36" fill="#7FB3C1" stroke="#222" stroke-width="3"/>
  </g>

  <!-- 角色融合 -->
  <g transform="translate(1270,270)">
    <circle cx="55" cy="55" r="48" fill="#D49C63" fill-opacity="0.65" stroke="#222" stroke-width="3"/>
    <circle cx="105" cy="55" r="48" fill="#CBBE69" fill-opacity="0.65" stroke="#222" stroke-width="3"/>
    <circle cx="80" cy="98" r="48" fill="#8AAEC0" fill-opacity="0.65" stroke="#222" stroke-width="3"/>
  </g>

  <!-- CLI Desktop -->
  <g transform="translate(1335,380)">
    <rect x="0" y="0" width="95" height="70" rx="4" fill="#2D3033" stroke="#222" stroke-width="4"/>
    <polyline points="16,25 35,35 16,46" stroke="#F2F2F2" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="45" y1="48" x2="76" y2="48" stroke="#F2F2F2" stroke-width="4" stroke-linecap="round"/>
    <rect x="120" y="-8" width="110" height="78" rx="5" fill="#E9ECE9" stroke="#222" stroke-width="4"/>
    <rect x="135" y="10" width="58" height="36" fill="#B8CED8" stroke="#222" stroke-width="2"/>
    <rect x="170" y="38" width="54" height="36" fill="#D6C36C" stroke="#222" stroke-width="2"/>
  </g>

  <!-- Mobile -->
  <g transform="translate(1390,610)">
    <rect x="0" y="0" width="76" height="122" rx="12" fill="#DDE5E8" stroke="#222" stroke-width="5"/>
    <rect x="14" y="18" width="48" height="70" rx="4" fill="#F4F1E5" stroke="#222" stroke-width="2"/>
    <rect x="18" y="24" width="14" height="14" fill="#9EAD63"/>
    <rect x="42" y="24" width="14" height="14" fill="#D4A05F"/>
    <rect x="18" y="50" width="14" height="14" fill="#C47C63"/>
    <rect x="42" y="50" width="14" height="14" fill="#7890A3"/>
    <line x1="25" y1="105" x2="51" y2="105" stroke="#222" stroke-width="3" stroke-linecap="round"/>
  </g>

  <!-- 安全AGI -->
  <g transform="translate(62,450)">
    <path d="M55 0 L110 20 L100 88 Q55 118 10 88 L0 20 Z" fill="#8FA3AA" stroke="#222" stroke-width="4"/>
    <rect x="38" y="40" width="34" height="30" fill="#D0AD55" stroke="#222" stroke-width="3"/>
    <path d="M45 40 C45 20,65 20,65 40" class="iconStroke thin"/>
    <rect x="132" y="38" width="80" height="70" rx="22" fill="#D9E0E3" stroke="#222" stroke-width="4"/>
    <circle cx="155" cy="70" r="6" fill="#222"/>
    <circle cx="188" cy="70" r="6" fill="#222"/>
    <line x1="172" y1="32" x2="172" y2="10" class="iconStroke thin"/>
  </g>

  <!-- 组织优先 -->
  <g transform="translate(58,805)">
    <circle cx="24" cy="25" r="19" fill="#E9BA9A" stroke="#222" stroke-width="3"/>
    <circle cx="75" cy="21" r="20" fill="#F0C3A2" stroke="#222" stroke-width="3"/>
    <circle cx="126" cy="26" r="18" fill="#E7B593" stroke="#222" stroke-width="3"/>
    <path d="M0 78 C5 50,44 50,50 78" fill="#9A7660" stroke="#222" stroke-width="3"/>
    <path d="M50 80 C58 48,95 48,104 80" fill="#C8B06F" stroke="#222" stroke-width="3"/>
    <path d="M108 78 C114 52,148 52,154 78" fill="#8DA7B8" stroke="#222" stroke-width="3"/>
    <rect x="177" y="0" width="72" height="92" fill="#F7F7F2" stroke="#222" stroke-width="4"/>
    <path d="M190 25 l9 9 l18 -22" stroke="#B88742" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M190 52 l9 9 l18 -22" stroke="#B88742" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M190 78 l9 9 l18 -22" stroke="#B88742" stroke-width="5" fill="none" stroke-linecap="round"/>
  </g>

  <!-- 偏向行动 -->
  <g transform="translate(230,660)">
    <path d="M0 86 L90 86 L90 62 L132 98 L90 132 L90 108 L0 108 Z" fill="#F3F3EF" stroke="#222" stroke-width="3"/>
    <circle cx="70" cy="34" r="18" fill="#F0C0A0" stroke="#222" stroke-width="3"/>
    <path d="M72 54 L45 82 L78 95 L106 130" class="iconStroke"/>
    <path d="M55 80 L20 105" class="iconStroke"/>
    <path d="M77 96 L50 132" class="iconStroke"/>
    <path d="M80 62 L114 55" class="iconStroke"/>
    <path d="M44 82 L35 54" class="iconStroke"/>
    <path d="M-20 75 L-60 75 M-15 105 L-65 115" stroke="#888" stroke-width="4" stroke-linecap="round"/>
  </g>

  <!-- 移除旧功能 -->
  <g transform="translate(110,865)">
    <rect x="0" y="35" width="70" height="70" fill="#D9D9D3" stroke="#222" stroke-width="4"/>
    <line x1="8" y1="35" x2="62" y2="105" stroke="#C45D55" stroke-width="5"/>
    <line x1="62" y1="35" x2="8" y2="105" stroke="#C45D55" stroke-width="5"/>
    <path d="M105 45 L190 30 L190 120 L105 105 Z" fill="#E7D36B" stroke="#222" stroke-width="4"/>
    <circle cx="108" cy="56" r="15" fill="#D08A5C" stroke="#222" stroke-width="4"/>
    <circle cx="150" cy="88" r="15" fill="#D08A5C" stroke="#222" stroke-width="4"/>
    <line x1="121" y1="64" x2="145" y2="82" class="iconStroke thin"/>
    <line x1="119" y1="94" x2="145" y2="86" class="iconStroke thin"/>
    <rect x="220" y="50" width="65" height="90" rx="8" fill="#D0D4D5" stroke="#222" stroke-width="4"/>
    <line x1="214" y1="50" x2="292" y2="50" class="iconStroke"/>
    <line x1="238" y1="68" x2="238" y2="126" stroke="#777" stroke-width="3"/>
    <line x1="267" y1="68" x2="267" y2="126" stroke="#777" stroke-width="3"/>
  </g>

  <!-- 自动化 -->
  <g transform="translate(1280,655)">
    <rect x="0" y="26" width="78" height="70" rx="20" fill="#D9E1E4" stroke="#222" stroke-width="4"/>
    <circle cx="23" cy="60" r="7" fill="#222"/>
    <circle cx="55" cy="60" r="7" fill="#222"/>
    <path d="M22 78 Q39 90 57 78" class="iconStroke thin"/>
    <line x1="39" y1="26" x2="39" y2="0" class="iconStroke thin"/>
    <path d="M118 42 l18 -10 l18 10 l0 20 l-18 10 l-18 -10 z" fill="#9AA4AA" stroke="#222" stroke-width="4"/>
    <circle cx="136" cy="52" r="10" fill="#F4F1E5" stroke="#222" stroke-width="3"/>
  </g>

  <!-- EVALS -->
  <g transform="translate(1295,825)">
    <rect x="0" y="0" width="78" height="105" fill="#F6F6F0" stroke="#222" stroke-width="4"/>
    <rect x="20" y="-14" width="38" height="22" rx="6" fill="#C5C0B6" stroke="#222" stroke-width="3"/>
    <path d="M14 30 l8 8 l16 -20" stroke="#B88742" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M14 60 l8 8 l16 -20" stroke="#B88742" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M14 90 l8 8 l16 -20" stroke="#B88742" stroke-width="5" fill="none" stroke-linecap="round"/>
    <rect x="115" y="70" width="18" height="35" fill="#C46F5C" stroke="#222" stroke-width="2"/>
    <rect x="145" y="45" width="18" height="60" fill="#D6B45D" stroke="#222" stroke-width="2"/>
    <rect x="175" y="20" width="18" height="85" fill="#7890A3" stroke="#222" stroke-width="2"/>
    <polyline points="105,105 205,105" class="iconStroke thin"/>
    <circle cx="125" cy="35" r="22" fill="#E7E7DF" stroke="#222" stroke-width="3"/>
    <line x1="142" y1="52" x2="175" y2="85" class="iconStroke thin"/>
  </g>
</svg>'''

out = Path(__file__).with_name('anthropic_product_team_asset_master.svg')
out.write_text(svg, encoding='utf-8')
print(f"Created {out} ({out.stat().st_size} bytes)") 
