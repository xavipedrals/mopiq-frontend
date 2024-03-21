const deckTopics = [
    { value: 1, name: "Medicine", color: "#0891B2", backgroundColor: "#E0F2FE", imageName: "medicine" },
    { value: 2, name: "Languages", color: "#D97706", backgroundColor: "#FEF3C7", imageName: "languages" },
    { value: 3, name: "Geography", color: "#BC553A", backgroundColor: "#FBE8D7", imageName: "geography" },
    { value: 4, name: "School", color: "#4F46E5", backgroundColor: "#E0E7FF", imageName: "school" },
    { value: 5, name: "Maths", color: "#0D9488", backgroundColor: "#CCFBF1", imageName: "maths" },
    { value: 6, name: "computing", color: "#FCA311", backgroundColor: "#CCFBF1", imageName: "computing" },
    { value: 7, name: "games", color: "#AF52DE", backgroundColor: "#CCFBF1", imageName: "games" },
    { value: 8, name: "anatomy", color: "#65A30D", backgroundColor: "#CCFBF1", imageName: "anatomy" },
    { value: 9, name: "biology", color: "#16A34A", backgroundColor: "#CCFBF1", imageName: "biology" },
    { value: 10, name: "chemistry", color: "#EA580C", backgroundColor: "#CCFBF1", imageName: "chemistry" },
    { value: 11, name: "history", color: "#D97706", backgroundColor: "#CCFBF1", imageName: "history" },
    { value: 12, name: "law", color: "#DC2626", backgroundColor: "#CCFBF1", imageName: "law" },
    { value: 13, name: "music", color: "#DB2777", backgroundColor: "#CCFBF1", imageName: "music" },
    { value: 14, name: "physics", color: "#4F46E5", backgroundColor: "#CCFBF1", imageName: "physics" },
    { value: 0, name: "other", color: "#AACC00", backgroundColor: "#CCFBF1", imageName: "other" },
  ];
  
  // Function to find a deck topic by its number
  export function getDeckTopicByValue(value) {
    const topic = deckTopics.find(topic => topic.value === value);
    return topic || deckTopics[deckTopics.length - 1]; // Fallback to other topic
  }

  export function getAvatarImageName(num) {
    return `/avatar/avatar-${num % 73}.svg`;
  }