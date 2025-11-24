import ReplySuggestionsCard from '../ReplySuggestionsCard';

export default function ReplySuggestionsCardExample() {
  return (
    <ReplySuggestionsCard
      replies={[
        "您好！感謝您的詢問。我看到您想在 Chatswood 或 North Sydney 找 2 房公寓，預算在 80-100 萬之間。這個價位在這兩個區域確實有很多不錯的選擇！我手邊剛好有幾個很適合的物件，都有停車位且靠近火車站。方便的話，我們可以約個時間帶您看房嗎？",
        "Hi！您的需求我都記下了～Chatswood 和 North Sydney 都是很棒的區域，交通超方便！您的預算範圍內我有幾個推薦的物件，都符合您要的 2 房、有車位、近火車站。要不要這週末找個時間，我帶您實地看看？順便可以聊聊這些區域的優缺點 😊",
        "您好！很高興收到您的訊息。根據您的需求（2 房公寓、80-100 萬預算、Chatswood 或 North Sydney、近火車站、有停車位），我這邊有幾個非常適合的物件可以推薦給您。這兩個區域目前市場很活躍，好的物件很快就會被搶走。建議我們盡快安排看房，您覺得這週末或下週初有空嗎？",
      ]}
    />
  );
}
