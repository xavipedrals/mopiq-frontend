const deckTopics = [
    { value: 1, name: "Medicine", color: "#0891B2", backgroundColor: "#E0F2FE", imageName: "medicine", sidebarIcon: "stethoscope" },
    { value: 2, name: "Languages", color: "#D97706", backgroundColor: "#FEF3C7", imageName: "languages", sidebarIcon: "language-hiragana" },
    { value: 3, name: "Geography", color: "#BC553A", backgroundColor: "#FBE8D7", imageName: "geography", sidebarIcon: "world" },
    { value: 4, name: "School", color: "#4F46E5", backgroundColor: "#E0E7FF", imageName: "school", sidebarIcon: "school" },
    { value: 5, name: "Maths", color: "#0D9488", backgroundColor: "#CCFBF1", imageName: "maths", sidebarIcon: "math" },
    { value: 6, name: "computing", color: "#FCA311", backgroundColor: "#FEE3B8", imageName: "computing", sidebarIcon: "device-laptop" },
    { value: 7, name: "games", color: "#AF52DE", backgroundColor: "#E7CBF5", imageName: "games", sidebarIcon: "device-gamepad-2" },
    { value: 8, name: "anatomy", color: "#65A30D", backgroundColor: "#ECFCCB", imageName: "anatomy", sidebarIcon: "lungs" },
    { value: 9, name: "biology", color: "#16A34A", backgroundColor: "#DCFCE7", imageName: "biology", sidebarIcon: "microscope" },
    { value: 10, name: "chemistry", color: "#EA580C", backgroundColor: "#FFEDD5", imageName: "chemistry", sidebarIcon: "flask-2" },
    { value: 11, name: "history", color: "#D97706", backgroundColor: "#FEF3C7", imageName: "history", sidebarIcon: "book" },
    { value: 12, name: "law", color: "#DC2626", backgroundColor: "#FEE2E2", imageName: "law", sidebarIcon: "scale" },
    { value: 13, name: "music", color: "#DB2777", backgroundColor: "#FCE7F3", imageName: "music", sidebarIcon: "music" },
    { value: 14, name: "physics", color: "#4F46E5", backgroundColor: "#E0E7FF", imageName: "physics", sidebarIcon: "atom" },
    { value: 0, name: "other", color: "#AACC00", backgroundColor: "#F2F7D9", imageName: "other", sidebarIcon: "books" },
  ];
  
  // Function to find a deck topic by its number
  export function getDeckTopicByValue(value) {
    const topic = deckTopics.find(topic => topic.value === value);
    return topic || deckTopics[deckTopics.length - 1]; // Fallback to other topic
  }

  export function getDeckTopicByPostgresId(id) {
    if (!id) {
      return getDeckTopicByValue(0);
    }
    const topic = deckTopics.find(topic => topic.imageName === String(id).toLowerCase());
    return topic || getDeckTopicByValue(0);
  }

export function looksLikePostgresSnapshotId(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || '');
}

export function getAllDeckTopics() {
  return deckTopics;
}

export function sidebarTablerIconUrl(imageName) {
  const topic = getDeckTopicByPostgresId(imageName);
  return `/topics/tabler/${topic.sidebarIcon}.svg`;
}

export function getAvatarImageName(num) {
  return `/avatar/avatar-${num % 73}.svg`;
}