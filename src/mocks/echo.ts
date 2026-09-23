export interface TrailEvent {
  id: number
  title: string
  date: string
  quarter: number
  happen: string[]
  emotion: string
  like: string
  dislike: string
  value: string
  quote: string
  signals?: InsightSignal[]
  dashboard?: DashboardProfile
  isNew?: boolean
}
export type InsightFramework = 'riasec' | 'disc' | 'schein'
export interface InsightSignal {
  framework: InsightFramework
  dimension: string
  strength: number
  evidenceQuote: string
}
export interface DashboardProfile {
  persona: { headline: string; summaries: string[]; quote: string }
  anchor: {
    primary: string
    ability: string[]
    motivation: string[]
    values: string[]
  }
  keywords: { text: string; weight: number }[]
  patterns: { title: string; evidenceQuote: string }[]
  northStar: {
    primaryAnchor: string
    tagline: string
    desires: string[]
    bottomLine: string
    nextSteps: string[]
  }
}
export interface Message {
  role: 'user' | 'echo'
  text: string
}
export const trailEvents: TrailEvent[] = [
  {
    id: 1,
    title: '前手交接感覺籌碼不足',
    date: '5/25',
    quarter: 2,
    happen: [
      '前手交接產品給我，感受到自己的聲勢與籌碼不足',
      '發現同事間會出現貶低討論，但自己被排除在外',
      '在缺乏籌碼下，感覺被排除在關鍵決策討論之外',
    ],
    emotion: '難過、自我懷疑、無力、不安',
    like: '我擅長把一句刺激性的話拆解成事實與推論兩層。',
    dislike: '討厭職場關係靠貶低別人來建立，也討厭自己被排除在決策外。',
    value: '實質的產品洞見價值應該被看見，職場關係應該建立在尊重而不是背後的貶低與八卦。',
    quote: '感覺我好屎，該不會我才是小丑',
  },
  {
    id: 2,
    title: '同事說我預設立場',
    date: '5/26',
    quarter: 2,
    happen: [
      '同事指出我會預設他人立場，並直接當成既定事實承受',
      '聽到後想起男友也曾說過我習慣預設立場',
    ],
    emotion: '不安、辯解、想改善的積極反思',
    like: '想練習把不確定的推論和事實分開，追求更理性成熟的判斷。',
    dislike: '討厭自己容易把推論當事實，陷入緊張防禦的循環。',
    value: '重視自我覺察與理性判斷，願意直面自己的弱點去修正。',
    quote: '男友跟同事都說我會預設立場欸那我想改變',
  },
  {
    id: 3,
    title: '英文學習方法焦慮',
    date: '6/3',
    quarter: 2,
    happen: [
      '看到同事用新工具學英文，立刻擔心自己落後',
      '曾同時開多個學習項目卻沒有完整做完',
      '被點出跟風焦慮的模式',
    ],
    emotion: '焦慮、被點出模式後的釋然感',
    like: '在意自己是否走在解決核心瓶頸的路上。',
    dislike: '討厭看到別人用什麼就焦慮跟風，也不喜歡分散沒做完的自己。',
    value: '重視找到真正對準目標的高效方法，而不是靠模仿他人緩解焦慮。',
    quote: '我是不是又落後了？',
  },
  {
    id: 4,
    title: '開悟：主動說故事',
    date: '6/6',
    quarter: 2,
    happen: [
      '看到同事限動後，意識到自己把別人塑造的形象當成事實在焦慮',
      '領悟到讓自己焦慮的都是別人說的故事，不代表真實',
    ],
    emotion: '釋然開悟、興奮，也有點不確定這算不算成長的自我懷疑',
    like: '在意如何看清事情全貌、建立健康的自我敘事。',
    dislike: '討厭盲目相信他人展示出來的人設而讓自己焦慮或內耗。',
    value: '重視獨立思考、理性拆解他人敘事的能力，並主動為自己說故事來獲得成長動力。',
    quote: '我們更應該說故事，對自己說，激勵自己',
  },
  {
    id: 5,
    title: '哈利波特學院測驗',
    date: '6/8',
    quarter: 2,
    happen: [
      '做了哈利波特學院性格測驗，被歸在雷文克勞',
      '測驗解讀我是好奇心驅動的探索者',
      '額外提到共同弱點：把理解世界誤認為已經前進',
    ],
    emotion: '偏正向、被認可的開心，也帶著警覺',
    like: '在意自己是否真的持續進步，而不只是原地理解世界。',
    dislike: '討厭陷入把理解世界誤認為已經前進的狀態。',
    value: '重視好奇心驅動的深度理解，但也期許能把思考轉化成行動。',
    quote: '好奇心驅動的探索者，正在努力把思考變成行動',
  },
  {
    id: 6,
    title: '主管報告雙標對待',
    date: '7/2',
    quarter: 3,
    happen: [
      '觀察到主管對我跟其他同事給出明顯不同的標準',
      '主管要求我約會議室，其他人可以直接口頭同步',
      '主管未特別說明原由，我覺得不方便也沒問',
    ],
    emotion: '生氣、覺得不合理、委屈',
    like: '主管該有的一視同仁，希望被公平對待、被合理解釋。',
    dislike: '沒有理由、被無緣無故區分對待的雙標處理方式。',
    value: '一視同仁、被合理解釋的公平對待，是你在職場關係裡格外重視也格外敏感的底線。',
    quote: '主管不應該要一視同仁嗎？',
  },
]
export const demoEvent: TrailEvent = {
  id: 7,
  title: '工程師離職引發職業倦怠',
  date: '7/20',
  quarter: 3,
  happen: [
    '工程師離職，並建議我也快點離開',
    '感覺下半年開發量能不足，難以再做更大的事',
    'AI時代下市場緊縮，1-3年經驗PM職缺變少',
  ],
  emotion: '職業倦怠、心好累，對環境與市場機會的不確定感與焦慮',
  like: '想用具體證據和方法判斷去留，而不是靠直覺或情緒衝動做決定。',
  dislike: '討厭在資源持續萎縮、缺乏開發量能撐得起產出的環境裡硬撐。',
  value: '我要靠方法，而不是直覺或恐慌，確認環境到底還能不能支撐我的成長。',
  quote: '我想知道怎麼做才能知道我現在環境到底還能不能支撐我的成長？',
  isNew: true,
}

export const suggestions = [
  {
    icon: '📝',
    title: '日記/貼文',
    subtitle: '把你隨手寫下的心情，變成看得懂的自己',
    text: '今天團隊的工程師提了離職，我有些職業倦怠，也想知道現在的環境還能不能支持我的成長。',
  },
  {
    icon: '📄',
    title: 'CV/履歷',
    subtitle: '從過去的軌跡，找出屬於你的價值',
    text: '我是一位有三年經驗的產品經理，負責需求訪談、產品規劃及跨部門協作。我想整理自己的優勢與下一步方向。',
  },
  {
    icon: '💬',
    title: '隨心聊聊',
    subtitle: '從最近的小事開始，慢慢整理你的想法',
    text: '最近工作讓我覺得有點累，想聊聊我在意的事，以及接下來可以做的小改變。',
  },
]

export interface DemoConversation {
  id: string
  label: string
  description: string
  turns: string[]
}

export const demoConversations: DemoConversation[] = [
  {
    id: 'simplified-spec',
    label: '規格被簡化',
    description: '努力被否定',
    turns: [
      '我把新功能的效益推估寫得很仔細，附上三種情境的計算方式，結果主管在會議上直接說這太複雜，臨時決定只用最簡單的版本報告給老闆看，事前完全沒跟我討論。',
      '我很生氣也有點委屈，那份分析是我花了兩天整理的，而且我覺得用更細的方法算出來的數字才站得住腳，不是隨便講講，可是在他們眼中，我做的事好像就只是「想太多」。',
      '我在意的其實不是誰採不採用，我覺得重要的是這個判斷過程本身要經得起檢驗，這也是我一直覺得自己適合做這份工作的原因，我只是希望這份努力至少有機會被看到。',
    ],
  },
  {
    id: 'single-omission',
    label: '單次疏漏',
    description: '自我懷疑',
    turns: [
      '上週工程那邊說我寫的流程文件有個地方邏輯銜接不上，後來討論完發現只是我漏寫了一個例外情況，但當下我腦袋一片空白，一直在想是不是這次沒有先想周全。',
      '我知道這次只是單一個漏寫的狀況，但我這幾個月一直覺得自己好像沒有以前那麼細心了，會不會我真的開始不適合當 PM，還是只是最近太累了。',
      '如果只講這一次的事，其實我發現問題的當下能馬上釐清、跟工程一起把遺漏的情境補上，這件事我處理得算快，我覺得自己真正在意的是問題被發現時能不能立刻回應處理，而不是有沒有一次就寫到完美。',
    ],
  },
  {
    id: 'cross-team-success',
    label: '跨團隊成功',
    description: '正向成就',
    turns: [
      '這週我們那個卡了快兩個月的功能終於上線了，使用數據比預期好很多，合作團隊主動跟我說回饋變好了。',
      '我真的很有成就感，尤其這次我堅持先花時間跟實際使用者做幾場訪談才動手設計，而不是直接照對方提的需求硬做，雖然一開始被念說太慢、拖進度。',
      '我覺得這次能成功，是因為我沒有把對方提的需求直接當成答案，而是先搞懂真正卡住的地方在哪，我一直覺得自己擅長的就是把模糊的抱怨拆解成具體可以解決的問題，這次證明這個方法是對的，接下來我也想試著把這套方法用在更早期的規劃階段。',
    ],
  },
]
export function mockReply(text: string, round: number): string {
  const opening = /履歷|優勢|經驗/.test(text)
    ? '你提到了過去的經驗與能力，我們可以一起找出其中反覆出現的優勢。'
    : /累|焦慮|離職|煩/.test(text)
      ? '聽起來最近的變化讓你有些疲憊，也讓你開始重新思考自己的方向。'
      : '謝謝你願意分享，我有聽到你對這件事的在意。'
  return (
    opening +
    (round === 1
      ? '\n\n這件事裡，最讓你在意的是什麼？是成長的機會、被理解，還是能自己做選擇？'
      : round === 2
        ? '\n\n如果先把別人的期待放在一旁，你希望自己接下來有什麼不同？可以從一個小行動開始。'
        : '\n\n我們已經有一些可以整理的線索了。你可以繼續聊，或點選 Generate Insight，看看這次的 Echo Card。')
  )
}
