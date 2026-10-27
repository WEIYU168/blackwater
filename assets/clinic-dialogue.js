const topics = [
  {
    title: '您為什麼願意長年照顧病人？',
    lines: [
      '這些都是住在我們身邊的鄉親。疾病已經讓他們受苦，不能再因為付不起醫藥費，就讓人失去就醫的機會。',
      '孫理蓮女士、謝緯醫師和許多人一起出力，讓免費診療能夠持續。照顧病人，需要大家長久地彼此扶持。'
    ]
  },
  {
    title: '除了醫治腿腳，還能做些什麼？',
    lines: [
      '先坐在病人身旁，聽他把話說完。腿腳不方便，不代表一個人失去了價值；我們更要尊重他的感受和選擇。',
      '治療之後，生活仍要繼續。碧梅和大家一起教病友編織，讓他們能靠手藝維持生活，也重新找回信心。'
    ]
  },
  {
    title: '您希望這場調查帶來什麼？',
    lines: [
      '我希望鄉親不必再承受同樣的痛苦。除了照顧眼前的病人，也要找出致病原因，改善大家生活的環境。'
    ]
  }
];

// Historical dramatization, not a transcript or quotation from Dr. Wang.
export function showWangConversation(game, { element, modal, dialogue }) {
  const menu = () => {
    const buttons = topics.map(topic => element('button', {
      class: 'btn', style: 'width:100%;text-align:left;padding:13px 16px',
      onclick: () => speak(topic.lines)
    }, topic.title));
    buttons.push(element('button', {
      class: 'btn', style: 'width:100%;text-align:left;padding:13px 16px',
      onclick: () => speak([game.state.isSolved('L10')
        ? '你已經讀懂書桌上的提醒了。願這些話，也陪著你繼續照顧身邊的人。'
        : '我的書桌在診所另一側。手寫稿、行列代號表和標記物都在那裡，細心對照，就能找出我留給自己的提醒。'])
    }, '想請教書桌上的線索'));
    const sources = element('details', null,
      element('summary', { style: 'cursor:pointer' }, '關於這段對話'),
      element('p', { class: 'muted' }, '依王金河醫師的服務事蹟撰寫的遊戲改編對話，並非歷史人物的逐字原話。'),
      element('p', null, element('a', { href: 'https://www.hwe.org.tw/award/winner/cG9zdDo2NzI%3D', target: '_blank', rel: 'noopener noreferrer' }, '醫療奉獻獎：王金河'), ' · ',
        element('a', { href: 'https://www.ntm.gov.tw/News_Content_Due.aspx?n=5652&s=146873', target: '_blank', rel: 'noopener noreferrer' }, '國立臺灣博物館：王金河醫師影像紀錄')));
    const view = modal({
      title: '與王金河醫師聊聊', sub: '金河診所 · 改編對話', narrow: true,
      body: element('div', { class: 'col', style: 'gap:10px' },
        element('p', null, '王醫師輕輕扶穩病人的腿腳，確認包紮的情形，抬頭向你招呼。'),
        ...buttons, sources),
      foot: [element('button', { class: 'btn primary', onclick: () => view.close() }, '謝謝醫師，繼續參觀')]
    });
    function speak(lines) {
      view.close();
      dialogue(lines.map(text => ({ who: '王金河醫師', text, source: 'adapted' })), menu);
    }
  };
  menu();
}
