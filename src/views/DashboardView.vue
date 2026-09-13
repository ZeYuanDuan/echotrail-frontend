<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
const showV2 = ref(false)
const modal = ref<HTMLDialogElement | null>(null)
</script>
<template>
  <div class="dashboard-content">
    <header class="flex flex-wrap items-start justify-between gap-3">
      <h1 class="h1">My Dashboard</h1>
      <Button
        variant="outline"
        type="button"
        :aria-expanded="showV2"
        aria-controls="dashboard-v2"
        @click="showV2 = !showV2"
      >
        {{ showV2 ? '收起 V2 假資料' : '查看 V2 假資料' }}
      </Button>
    </header>
    <p class="demo-note">以下為示範分析，分數與內容使用固定假資料。</p>

    <div class="row">
      <div class="card" style="flex: 1">
        <div class="card-h1">硬實力證據</div>
        <ul class="evidence-list">
          <li>
            具備<span class="hl">系統化拆解問題</span>的能力（事實／推論／可觀察項目四步驟框架）
          </li>
          <li>能<span class="hl">主動評估</span>並排序多元學習資源的投入效益，而非盲目跟風</li>
          <li>在<span class="hl">產品規格</span>與風險評估的實務工作中，展現高標準要求</li>
        </ul>
        <div class="evidence-src">證據來源：事件3、事件5</div>
      </div>
      <div class="card" style="flex: 1">
        <div class="card-h1">軟實力證據</div>
        <ul class="evidence-list">
          <li>感受到人際衝突後會主動求助並<span class="hl">反思修正</span>，而非單純情緒發洩</li>
          <li>具備看穿他人敘事動機、不被表面比較牽動情緒的<span class="hl">思辨</span>能力</li>
          <li class="old-only">
            面對高壓的人際／組織政治情境，仍保持對自己能力與貢獻價值的清晰判斷
          </li>
          <li class="new-only" id="soft3New">
            面對高壓的人際／組織政治／團隊成員流失等情境，仍保持對自己能力與貢獻價值的清晰判斷，而不是情緒化跟風離職<span
              class="new-tag"
              >NEW</span
            >
          </li>
        </ul>
        <div class="evidence-src">
          證據來源：事件2、事件4、事件6<span class="new-only">、事件7</span>
        </div>
      </div>
    </div>

    <div class="card riasec-card">
      <div style="flex: 1">
        <div class="card-h1">當性格遇見職業：一場關於自我發現的 RIASEC 旅程</div>
        <div class="riasec-row">
          <div class="riasec-label">I 研究型</div>
          <div class="riasec-track"><div class="riasec-fill" style="width: 80%"></div></div>
          <div>80</div>
        </div>
        <div class="riasec-row">
          <div class="riasec-label">E 企業型</div>
          <div class="riasec-track"><div class="riasec-fill" style="width: 65%"></div></div>
          <div>65</div>
        </div>
        <div class="riasec-row">
          <div class="riasec-label">C 事務型</div>
          <div class="riasec-track"><div class="riasec-fill" style="width: 55%"></div></div>
          <div>55</div>
        </div>
        <div class="riasec-row">
          <div class="riasec-label">A 藝術型</div>
          <div class="riasec-track"><div class="riasec-fill" style="width: 50%"></div></div>
          <div>50</div>
        </div>
        <div class="riasec-row">
          <div class="riasec-label">S 社會型</div>
          <div class="riasec-track"><div class="riasec-fill" style="width: 45%"></div></div>
          <div>45</div>
        </div>
        <div class="riasec-row">
          <div class="riasec-label">R 實作型</div>
          <div class="riasec-track"><div class="riasec-fill" style="width: 40%"></div></div>
          <div>40</div>
        </div>
        <div class="note-green new-only">本次事件與既有方向一致，暫不調整分數</div>
      </div>
      <div class="riasec-summary">
        以研究型為核心，擅長拆解問題本質，同時具備企業型的推動力，但相對不擅長依靠純社交手段建立關係。
      </div>
    </div>

    <div class="card disc-card">
      <div class="disc-quadrant">
        <div class="disc-cell" style="background: #e05252">D</div>
        <div class="disc-cell" style="background: #e6c320">I</div>
        <div class="disc-cell" style="background: #4ea36a">S</div>
        <div class="disc-cell" style="background: #9b6bc9">C</div>
        <div class="disc-dot" style="left: 134px; top: 148px"></div>
      </div>
      <div style="flex: 1">
        <div class="card-h2" style="margin-top: 0">你在職場的溝通風格</div>
        <div class="disc-legend">
          <div class="disc-legend-item">
            <span class="dot" style="background: #e05252"></span>D 直球、快決策：55
          </div>
          <div class="disc-legend-item">
            <span class="dot" style="background: #e6c320"></span>I 靠關係與敘事推動：35
          </div>
          <div class="disc-legend-item">
            <span class="dot" style="background: #4ea36a"></span>S 重穩定與節奏：45
          </div>
          <div class="disc-legend-item">
            <span class="dot" style="background: #9b6bc9"></span>C 重精確與流程：75
          </div>
        </div>
        <div class="body-txt">
          偏向 C
          型的精確流程導向，重視把問題拆解清楚後才行動，不擅長也不喜歡靠敘事包裝或人設經營來推動關係。
        </div>
        <div class="note-green new-only">本次事件與既有方向一致，暫不調整分數</div>
      </div>
    </div>
    <section id="dashboard-v2" v-show="showV2" aria-labelledby="dashboard-v2-title">
      <h2 id="dashboard-v2-title" class="mb-5 text-lg font-semibold text-foreground">V2 預覽</h2>
      <div class="row">
        <div class="card" style="flex: 1; background: #fdf6e3; border-color: #f0e0a8">
          <div class="card-h1">我的 Persona</div>
          <div
            style="
              background: #fffef9;
              border: 1px solid #eee0b0;
              border-radius: 12px;
              padding: 16px;
              margin-bottom: 14px;
            "
          >
            <div class="card-h2" style="margin-top: 0">我是誰？</div>
            <div class="body-txt">
              「一個渴望用<span class="hl">具體證據</span>判斷職涯去留、卻容易被人際比較觸發<span
                class="hl"
                >自我懷疑</span
              >的產品經理
              <span class="new-only">，也會被外部市場焦慮影響<span class="new-tag">NEW</span></span
              >」
            </div>
            <ul class="body-txt" style="padding-left: 18px; margin-top: 10px">
              <li>
                容易因為<span class="hl">和他人比較</span>（前手、同事、社群人設<span
                  class="new-only"
                  >、離職潮</span
                >）而觸發自我懷疑，即使自己實際的能力與貢獻並不差
              </li>
              <li>
                善於<span class="hl">自我覺察</span>，能主動拆解「事實 vs
                推論」，願意直面自己的弱點並持續修正
              </li>
              <li class="old-only">
                <span class="hl">好奇心驅動</span
                >、行動導向，但容易因比較心態陷入焦慮，或過度優化框架而延遲真正的前進
              </li>
              <li class="new-only">
                我的自我懷疑不只來自跟他人比較，也會在環境資源緊縮、外部市場消息不利時被觸發——這說明我的自我懷疑有兩個來源：人際敘事，以及對環境／市場現實的判斷<span
                  class="new-tag"
                  >NEW</span
                >
              </li>
            </ul>
          </div>
          <div
            style="
              background: #fffdf5;
              border: 1px dashed #e0c060;
              border-radius: 10px;
              padding: 10px 14px;
              font-size: 12.5px;
              color: #7a6a30;
              font-style: italic;
            "
          >
            代表句子：「男友跟同事都說我會預設立場欸那我想改變」
          </div>
        </div>

        <div class="card" style="flex: 1.3">
          <div class="card-h1" style="text-align: center">我的共鳴之錨</div>
          <div class="legend">
            <div class="legend-item">
              <span class="dot" style="background: #6c9bd1"></span>我擅長什麼？
            </div>
            <div class="legend-item">
              <span class="dot" style="background: #b98bd1"></span>我想要什麼？
            </div>
            <div class="legend-item">
              <span class="dot" style="background: #e8c15a"></span>我的標準是什麼？
            </div>
          </div>
          <div style="display: flex; justify-content: center">
            <svg width="440" height="330" viewBox="0 0 440 330">
              <circle cx="175" cy="145" r="120" fill="#6C9BD1" fill-opacity="0.55"></circle>
              <circle cx="265" cy="145" r="120" fill="#B98BD1" fill-opacity="0.55"></circle>
              <circle cx="220" cy="230" r="120" fill="#E8C15A" fill-opacity="0.55"></circle>
              <text x="100" y="60" class="circle-label" text-anchor="middle">我擅長什麼？</text>
              <text x="345" y="60" class="circle-label" text-anchor="middle">我想要什麼？</text>
              <text x="220" y="322" class="circle-label" text-anchor="middle">
                我的標準是什麼？
              </text>
              <text x="90" y="115" class="keyword" text-anchor="middle">高敏察力</text>
              <text x="78" y="140" class="keyword" text-anchor="middle">拆解事實推論</text>
              <text x="90" y="165" class="keyword" text-anchor="middle">跨域好奇心</text>
              <text x="350" y="115" class="keyword" text-anchor="middle">洞見被看見</text>
              <text x="350" y="140" class="keyword" text-anchor="middle">理性成熟</text>
              <text x="350" y="165" class="keyword" text-anchor="middle">解決核心瓶頸</text>
              <text x="220" y="273" class="keyword" text-anchor="middle">一視同仁</text>
              <text x="150" y="290" class="keyword" text-anchor="middle">尊重不八卦</text>
              <text x="290" y="290" class="keyword" text-anchor="middle">獨立敘事</text>
              <rect x="168" y="163" width="104" height="52" rx="12" class="anchor-box"></rect>
              <text x="220" y="185" class="anchor-text" text-anchor="middle">⚓ 專家達人</text>
              <text x="220" y="200" class="anchor-sub" text-anchor="middle">你的核心職涯錨定</text>
            </svg>
          </div>
          <button class="toggle-btn" @click="modal?.showModal()">查看完整說明 ▾</button>
        </div>
      </div>

      <div class="row">
        <div class="card" style="flex: 1">
          <div class="card-h1">重複關鍵字排行榜</div>
          <div class="wordcloud">
            <span style="font-size: 30px; color: #c0392b; font-weight: 800">比較焦慮</span>
            <span style="font-size: 26px; color: #3a6ea5; font-weight: 700">自我懷疑</span>
            <span style="font-size: 22px; color: #8e6b1f">過度分析</span>
            <span style="font-size: 22px; color: #5a8a4a">自我覺察</span>
            <span style="font-size: 16px; color: #888">好奇心</span>
            <span style="font-size: 16px; color: #888">產品洞見</span>
            <span class="new-only" style="font-size: 14px; color: #37a35a; font-weight: 700"
              >職業倦怠</span
            >
            <span class="new-only" style="font-size: 14px; color: #37a35a; font-weight: 700"
              >外部市場焦慮</span
            >
            <span style="font-size: 13px; color: #aaa">人設拆解</span>
            <span style="font-size: 13px; color: #aaa">公平一視同仁</span>
          </div>
        </div>
        <div class="card" style="flex: 1">
          <div class="card-h1">行為模式排行榜</div>
          <div class="behavior-item">
            <div class="behavior-num">1</div>
            <span
              >遇到比較情境（跟前手、同事、社群人設比較）就先<span class="hl">預設自己不足</span
              >或落後</span
            >
          </div>
          <div class="behavior-item">
            <div class="behavior-num">2</div>
            <span>面對不確定的人際訊號時，習慣先補完負面推論，之後才回頭求證</span>
          </div>
          <div class="behavior-item old-only">
            <div class="behavior-num">3</div>
            <span>傾向透過持續分析／優化框架來獲得安全感，有時反而延遲了實際的行動</span>
          </div>
          <div class="behavior-item new-only" id="behavior3New">
            <div class="behavior-num">3</div>
            <span
              >會因為身邊人的選擇（例如離職潮）或外部市場消息而想加快自己判斷的節奏，即使原本的傾向是理性分析<span
                class="new-tag"
                >NEW</span
              ></span
            >
          </div>
        </div>
      </div>

      <div class="card northstar-card">
        <div style="flex-shrink: 0">
          <svg width="468" height="432" viewBox="-40 -10 520 480">
            <polygon
              points="220.0,177.5 250.1,189.9 262.5,220.0 250.1,250.1 220.0,262.5 189.9,250.1 177.5,220.0 189.9,189.9"
              fill="none"
              stroke="#ddd8ce"
              stroke-width="1"
            />
            <polygon
              points="220.0,135.0 280.1,159.9 305.0,220.0 280.1,280.1 220.0,305.0 159.9,280.1 135.0,220.0 159.9,159.9"
              fill="none"
              stroke="#ddd8ce"
              stroke-width="1"
            />
            <polygon
              points="220.0,92.5 310.2,129.8 347.5,220.0 310.2,310.2 220.0,347.5 129.8,310.2 92.5,220.0 129.8,129.8"
              fill="none"
              stroke="#ddd8ce"
              stroke-width="1"
            />
            <polygon
              points="220.0,50.0 340.2,99.8 390.0,220.0 340.2,340.2 220.0,390.0 99.8,340.2 50.0,220.0 99.8,99.8"
              fill="none"
              stroke="#ddd8ce"
              stroke-width="1"
            />
            <line x1="220" y1="220" x2="220.0" y2="50.0" stroke="#ddd8ce" stroke-width="1" />
            <line x1="220" y1="220" x2="340.2" y2="99.8" stroke="#ddd8ce" stroke-width="1" />
            <line x1="220" y1="220" x2="390.0" y2="220.0" stroke="#ddd8ce" stroke-width="1" />
            <line x1="220" y1="220" x2="340.2" y2="340.2" stroke="#ddd8ce" stroke-width="1" />
            <line x1="220" y1="220" x2="220.0" y2="390.0" stroke="#ddd8ce" stroke-width="1" />
            <line x1="220" y1="220" x2="99.8" y2="340.2" stroke="#ddd8ce" stroke-width="1" />
            <line x1="220" y1="220" x2="50.0" y2="220.0" stroke="#ddd8ce" stroke-width="1" />
            <line x1="220" y1="220" x2="99.8" y2="99.8" stroke="#ddd8ce" stroke-width="1" />
            <g class="old-only">
              <polygon
                points="220.0,92.5 268.1,171.9 339.0,220.0 262.1,262.1 220.0,330.5 147.9,292.1 126.5,220.0 183.9,183.9"
                fill="#4a90d9"
                fill-opacity="0.35"
                stroke="#2f6fb0"
                stroke-width="2"
              ></polygon>
              <text
                x="220.0"
                y="12.0"
                font-size="11"
                font-weight="800"
                text-anchor="middle"
                fill="#333"
              >
                專家達人
              </text>
              <text
                x="220.0"
                y="26.0"
                font-size="10.5"
                text-anchor="middle"
                fill="#2f6fb0"
                font-weight="700"
              >
                75分
              </text>
              <text
                x="370.2"
                y="71.8"
                font-size="11"
                font-weight="800"
                text-anchor="start"
                fill="#333"
              >
                專業經理人
              </text>
              <text
                x="370.2"
                y="85.8"
                font-size="10.5"
                text-anchor="start"
                fill="#2f6fb0"
                font-weight="700"
              >
                40分
              </text>
              <text
                x="430.0"
                y="216.0"
                font-size="11"
                font-weight="800"
                text-anchor="start"
                fill="#333"
              >
                自由工作者
              </text>
              <text
                x="430.0"
                y="230.0"
                font-size="10.5"
                text-anchor="start"
                fill="#2f6fb0"
                font-weight="700"
              >
                70分
              </text>
              <text
                x="370.2"
                y="360.2"
                font-size="11"
                font-weight="800"
                text-anchor="start"
                fill="#333"
              >
                安穩可靠者
              </text>
              <text
                x="370.2"
                y="374.2"
                font-size="10.5"
                text-anchor="start"
                fill="#2f6fb0"
                font-weight="700"
              >
                35分
              </text>
              <text
                x="220.0"
                y="420.0"
                font-size="11"
                font-weight="800"
                text-anchor="middle"
                fill="#333"
              >
                創造者
              </text>
              <text
                x="220.0"
                y="434.0"
                font-size="10.5"
                text-anchor="middle"
                fill="#2f6fb0"
                font-weight="700"
              >
                65分
              </text>
              <text
                x="69.8"
                y="360.2"
                font-size="11"
                font-weight="800"
                text-anchor="end"
                fill="#333"
              >
                俠客
              </text>
              <text
                x="69.8"
                y="374.2"
                font-size="10.5"
                text-anchor="end"
                fill="#2f6fb0"
                font-weight="700"
              >
                60分
              </text>
              <text
                x="10.0"
                y="216.0"
                font-size="11"
                font-weight="800"
                text-anchor="end"
                fill="#333"
              >
                挑戰者
              </text>
              <text
                x="10.0"
                y="230.0"
                font-size="10.5"
                text-anchor="end"
                fill="#2f6fb0"
                font-weight="700"
              >
                55分
              </text>
              <text
                x="69.8"
                y="71.8"
                font-size="11"
                font-weight="800"
                text-anchor="end"
                fill="#333"
              >
                樂活族
              </text>
              <text
                x="69.8"
                y="85.8"
                font-size="10.5"
                text-anchor="end"
                fill="#2f6fb0"
                font-weight="700"
              >
                30分
              </text>
            </g>
            <g class="new-only">
              <polygon
                points="220.0,89.1 268.1,171.9 342.4,220.0 262.1,262.1 220.0,330.5 147.9,292.1 126.5,220.0 183.9,183.9"
                fill="#4a90d9"
                fill-opacity="0.35"
                stroke="#2f6fb0"
                stroke-width="2"
              ></polygon>
              <text
                x="220.0"
                y="12.0"
                font-size="11"
                font-weight="800"
                text-anchor="middle"
                fill="#333"
              >
                專家達人
              </text>
              <text
                x="220.0"
                y="26.0"
                font-size="10.5"
                text-anchor="middle"
                fill="#2f6fb0"
                font-weight="700"
              >
                77分
              </text>
              <text
                x="370.2"
                y="71.8"
                font-size="11"
                font-weight="800"
                text-anchor="start"
                fill="#333"
              >
                專業經理人
              </text>
              <text
                x="370.2"
                y="85.8"
                font-size="10.5"
                text-anchor="start"
                fill="#2f6fb0"
                font-weight="700"
              >
                40分
              </text>
              <text
                x="430.0"
                y="216.0"
                font-size="11"
                font-weight="800"
                text-anchor="start"
                fill="#333"
              >
                自由工作者
              </text>
              <text
                x="430.0"
                y="230.0"
                font-size="10.5"
                text-anchor="start"
                fill="#2f6fb0"
                font-weight="700"
              >
                72分
              </text>
              <text
                x="370.2"
                y="360.2"
                font-size="11"
                font-weight="800"
                text-anchor="start"
                fill="#333"
              >
                安穩可靠者
              </text>
              <text
                x="370.2"
                y="374.2"
                font-size="10.5"
                text-anchor="start"
                fill="#2f6fb0"
                font-weight="700"
              >
                35分
              </text>
              <text
                x="220.0"
                y="420.0"
                font-size="11"
                font-weight="800"
                text-anchor="middle"
                fill="#333"
              >
                創造者
              </text>
              <text
                x="220.0"
                y="434.0"
                font-size="10.5"
                text-anchor="middle"
                fill="#2f6fb0"
                font-weight="700"
              >
                65分
              </text>
              <text
                x="69.8"
                y="360.2"
                font-size="11"
                font-weight="800"
                text-anchor="end"
                fill="#333"
              >
                俠客
              </text>
              <text
                x="69.8"
                y="374.2"
                font-size="10.5"
                text-anchor="end"
                fill="#2f6fb0"
                font-weight="700"
              >
                60分
              </text>
              <text
                x="10.0"
                y="216.0"
                font-size="11"
                font-weight="800"
                text-anchor="end"
                fill="#333"
              >
                挑戰者
              </text>
              <text
                x="10.0"
                y="230.0"
                font-size="10.5"
                text-anchor="end"
                fill="#2f6fb0"
                font-weight="700"
              >
                55分
              </text>
              <text
                x="69.8"
                y="71.8"
                font-size="11"
                font-weight="800"
                text-anchor="end"
                fill="#333"
              >
                樂活族
              </text>
              <text
                x="69.8"
                y="85.8"
                font-size="10.5"
                text-anchor="end"
                fill="#2f6fb0"
                font-weight="700"
              >
                30分
              </text>
            </g>
          </svg>
        </div>
        <div class="northstar-text">
          <div class="card-h1">找到我的職場北極星：職涯錨定如何指引內心不變的追求</div>
          <div class="anchor-highlight old-only">⚓ 主要職涯錨定是：專家達人 75分</div>
          <div class="anchor-highlight new-only">
            ⚓ 主要職涯錨定是：專家達人 77分 <span class="new-tag">NEW</span>
          </div>
          <div class="card-h2">💡 一句話核心渴望</div>
          <div>「想憑扎實累積的專業能力被同儕與市場認可，而不是靠比較或人設定義自己的價值」</div>
          <div class="card-h2">🔍 最在乎的 3 件事</div>
          <ul>
            <li>專業能力被真正看見與認可</li>
            <li>獨立判斷不受他人敘事牽動</li>
            <li>面對不確定時能保持理性而非自我懷疑</li>
          </ul>
          <div class="card-h2">❌ 絕對不妥協的底線</div>
          <ul>
            <li>被無理由地區別對待／雙標</li>
          </ul>
          <div class="card-h2">🚀 下一步職涯指引</div>
          <ul>
            <li>適合職缺：資深產品經理／產品策略、使用者研究員、產品教練或顧問類角色</li>
            <li>核心建議：練習把「比較焦慮」轉化為具體的「專精精進」行動計畫</li>
          </ul>
          <div class="theory-note">本分析基於 Edgar Schein 職涯錨點理論的八大分類</div>
        </div>
      </div>
    </section>
  </div>

  <dialog
    ref="modal"
    class="details-dialog"
    aria-label="我是誰的完整說明"
    @click="$event.target === modal && modal?.close()"
  >
    <div class="modal-content">
      <button class="modal-close" aria-label="關閉完整說明" @click="modal?.close()">✕</button>
      <div class="modal-title">我是誰的完整說明</div>
      <div class="modal-columns">
        <div class="modal-col">
          <div class="modal-col-title">🔵 我擅長什麼？（能力基礎）</div>
          <ul>
            <li>
              具備高敏感度的<span class="hl">觀察力</span>，能快速察覺人際／職場中不合理的訊號
            </li>
            <li>
              擅長<span class="hl">自我反思</span>與<span class="hl">拆解問題</span
              >本質（區分事實與推論、看穿他人敘事目的）
            </li>
            <li>
              具備<span class="hl">跨領域好奇心</span>與行動力，願意<span class="hl">主動嘗試</span
              >新方法解決問題
            </li>
          </ul>
        </div>
        <div class="modal-col">
          <div class="modal-col-title">🟣 我想要什麼？（動機基礎）</div>
          <ul>
            <li>想要自己的產品洞見與實質能力被<span class="hl">真正看見與認可</span></li>
            <li>想要成為<span class="hl">理性成熟</span>、能區分事實與推論的人</li>
            <li>想要走在<span class="hl">真正解決</span>核心瓶頸的路上前進</li>
          </ul>
        </div>
        <div class="modal-col">
          <div class="modal-col-title">🟡 價值標準是什麼？（價值基礎）</div>
          <ul>
            <li>一視同仁、被<span class="hl">合理解釋</span>的公平對待，是絕對不能妥協的底線</li>
            <li>職場關係應建立在尊重與<span class="hl">實質貢獻</span>，而非八卦貶低或人設經營</li>
            <li>
              <span class="hl">獨立思考</span>、為自己建構積極敘事的能力，勝過被動接受他人塑造的故事
            </li>
          </ul>
        </div>
      </div>
    </div>
  </dialog>
</template>
