/**
 * Plant Name Extraction (Deno-compatible)
 */

import type { PlantMention } from "./types.ts";
import { conversationRegistry } from "./cache.ts";

const logger = {
  debug: (msg: string) => console.debug(`[PlantExtractor] ${msg}`),
};

// Common plant names for quick matching
const COMMON_PLANT_NAMES = new Set([
  // Vegetables
  "tomato", "tomatoes", "potato", "potatoes", "carrot", "carrots", "lettuce", "spinach",
  "kale", "broccoli", "cauliflower", "cabbage", "celery", "cucumber", "cucumbers",
  "zucchini", "squash", "pumpkin", "pumpkins", "eggplant", "pepper", "peppers",
  "bell pepper", "chili", "chilies", "onion", "onions", "garlic", "leek", "leeks",
  "asparagus", "artichoke", "beet", "beets", "radish", "radishes", "turnip", "turnips",
  "parsnip", "parsnips", "corn", "peas", "green beans", "beans", "lentils", "chickpeas",

  // Fruits
  "apple", "apples", "orange", "oranges", "lemon", "lemons", "lime", "limes",
  "grapefruit", "banana", "bananas", "grape", "grapes", "strawberry", "strawberries",
  "blueberry", "blueberries", "raspberry", "raspberries", "blackberry", "blackberries",
  "cherry", "cherries", "peach", "peaches", "plum", "plums", "apricot", "apricots",
  "mango", "mangoes", "pineapple", "pineapples", "watermelon", "cantaloupe", "honeydew",
  "melon", "kiwi", "papaya", "guava", "pomegranate", "fig", "figs", "date", "dates",
  "coconut", "coconuts", "avocado", "avocados",

  // Herbs
  "basil", "oregano", "thyme", "rosemary", "sage", "mint", "peppermint", "spearmint",
  "parsley", "cilantro", "coriander", "dill", "chives", "tarragon", "marjoram",
  "bay leaf", "bay laurel", "lavender", "chamomile", "lemongrass", "fennel", "cumin",
  "turmeric", "ginger",

  // Flowers
  "rose", "roses", "tulip", "tulips", "daisy", "daisies", "sunflower", "sunflowers",
  "lily", "lilies", "orchid", "orchids", "carnation", "carnations", "chrysanthemum",
  "dahlia", "dahlias", "peony", "peonies", "hydrangea", "hydrangeas", "marigold",
  "marigolds", "petunia", "petunias", "geranium", "geraniums", "begonia", "begonias",
  "zinnia", "zinnias", "pansy", "pansies", "violet", "violets", "iris", "irises",
  "daffodil", "daffodils", "hyacinth", "crocus", "amaryllis", "hibiscus", "jasmine",
  "gardenia", "magnolia", "camellia", "azalea", "rhododendron", "wisteria",
  "bougainvillea", "plumeria", "bird of paradise",

  // Houseplants
  "pothos", "philodendron", "monstera", "snake plant", "sansevieria", "spider plant",
  "peace lily", "rubber plant", "fiddle leaf fig", "ficus", "aloe", "aloe vera",
  "jade plant", "succulent", "succulents", "cactus", "cacti", "bamboo", "palm", "palms",
  "fern", "ferns", "boston fern", "maidenhair fern", "english ivy", "ivy", "dracaena",
  "zz plant", "chinese evergreen", "prayer plant", "calathea", "croton", "dieffenbachia",
  "anthurium", "bromeliad", "air plant", "tillandsia", "hoya", "string of pearls",
  "string of hearts",

  // Trees
  "oak", "maple", "pine", "spruce", "fir", "cedar", "birch", "ash", "elm", "willow",
  "poplar", "aspen", "beech", "hickory", "walnut", "chestnut", "cherry tree",
  "apple tree", "peach tree", "pear tree", "plum tree", "olive", "olive tree",
  "eucalyptus", "cypress", "redwood", "sequoia", "palm tree", "coconut palm",
  "magnolia tree", "dogwood", "redbud", "crepe myrtle", "japanese maple", "bonsai",

  // Shrubs
  "boxwood", "privet", "holly", "juniper", "yew", "forsythia", "lilac", "viburnum",
  "spirea", "barberry", "euonymus", "cotoneaster", "burning bush", "butterfly bush",
  "rose of sharon",
]);

// Plant-related context words
const PLANT_CONTEXT_WORDS = [
  "plant", "plants", "grow", "growing", "grew", "grown", "garden", "gardening",
  "water", "watering", "prune", "pruning", "fertilize", "fertilizing", "harvest",
  "harvesting", "seed", "seeds", "seedling", "seedlings", "cutting", "cuttings",
  "propagate", "propagating", "repot", "repotting", "transplant", "transplanting",
  "care", "caring", "leaf", "leaves", "flower", "flowers", "bloom", "blooming",
  "blossom", "fruit", "fruits", "vegetable", "vegetables", "herb", "herbs",
  "tree", "trees", "shrub", "shrubs", "vine", "vines", "bush", "bushes",
  "pot", "potted", "indoor", "outdoor", "houseplant", "houseplants",
];

// Patterns for identifying plant names
const PLANT_PATTERNS = [
  /my\s+([a-z][a-z\s]{2,25}?)(?:\s+plant|\s+tree|\s+bush|\s+vine)?(?:\s|$|,|\.|\?|!)/gi,
  /the\s+([a-z][a-z\s]{2,25}?)(?:\s+plant|\s+tree|\s+bush|\s+vine|\s+is|\s+needs|\s+has|\s+looks)/gi,
  /([a-z][a-z\s]{2,20}?)\s+(?:plant|tree|bush|vine|shrub|flower|herb)s?(?:\s|$|,|\.|\?|!)/gi,
  /(?:grow|plant|care\s+for|water|fertilize|prune|harvest|propagate)\s+(?:the\s+|my\s+|some\s+)?([a-z][a-z\s]{2,25}?)(?:\s|$|,|\.|\?|!)/gi,
  /(?:about|regarding)\s+(?:the\s+|my\s+)?([a-z][a-z\s]{2,25}?)(?:\s+plant|\s+tree|\s+bush)?(?:\s|$|,|\.|\?|!)/gi,
  /([A-Z][a-z]+\s+[a-z]+)(?:\s|$|,|\.|\?|!)/g,
];

// Common English words to exclude
const COMMON_ENGLISH_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "if", "then", "else",
  "when", "where", "what", "which", "who", "how", "why",
  "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did",
  "will", "would", "could", "should", "may", "might", "must", "can",
  "this", "that", "these", "those", "it", "its", "they", "them", "their",
  "we", "us", "our", "you", "your", "he", "him", "his", "she", "her", "i", "me", "my",
  "some", "any", "all", "most", "many", "much", "more", "less", "few", "little", "lot", "lots",
  "very", "too", "also", "just", "only", "even", "still", "already", "always", "never", "ever",
  "often", "sometimes", "usually", "really", "quite", "rather", "pretty",
  "about", "after", "before", "between", "during", "through", "from", "into", "onto",
  "with", "without", "for", "of", "in", "on", "at", "to", "by",
  "up", "down", "out", "off", "over", "under", "again", "back", "here", "there",
  "now", "today", "tomorrow", "yesterday",
  "thing", "things", "way", "ways", "time", "times", "day", "days",
  "year", "years", "week", "weeks", "month", "months",
  "something", "anything", "everything", "nothing",
  "someone", "anyone", "everyone", "nobody", "anybody", "everybody",
  "place", "room", "house", "home", "work", "life", "world",
  "people", "person", "child", "children", "man", "men", "woman", "women",
  "good", "bad", "new", "old", "big", "small", "long", "short", "high", "low",
  "great", "other", "same", "different", "first", "last", "next", "right", "left", "best",
  "want", "need", "know", "think", "see", "look", "find", "give", "take", "come", "go",
  "make", "get", "say", "tell", "ask", "use", "try", "help", "start", "stop", "keep",
  "let", "put", "set", "turn", "show", "hear", "leave", "call", "run", "move", "live",
  "believe", "feel", "bring",
]);

// ============================================================================
// Main Extraction Functions
// ============================================================================

export function extractPlantMentions(text: string): PlantMention[] {
  const mentions: PlantMention[] = [];
  const foundNames = new Set<string>();

  // Check registry first
  const registryMatches = findRegistryMatches(text);
  for (const match of registryMatches) {
    if (!foundNames.has(match.normalizedName)) {
      mentions.push(match);
      foundNames.add(match.normalizedName);
    }
  }

  // Check exact matches
  const exactMatches = findExactMatches(text);
  for (const match of exactMatches) {
    if (!foundNames.has(match.normalizedName)) {
      mentions.push(match);
      foundNames.add(match.normalizedName);
    }
  }

  // Pattern matches
  const patternMatches = findPatternMatches(text);
  for (const match of patternMatches) {
    if (!foundNames.has(match.normalizedName)) {
      mentions.push(match);
      foundNames.add(match.normalizedName);
    }
  }

  mentions.sort((a, b) => {
    const confidenceOrder = { high: 0, medium: 1, low: 2 };
    return confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
  });

  logger.debug(`Found ${mentions.length} plant mentions in text`);
  return mentions;
}

export function extractPlantMentionsFromHistory(
  messages: Array<{ text: string }>,
  limit: number = 5
): PlantMention[] {
  const allMentions: PlantMention[] = [];
  const foundNames = new Set<string>();

  for (let i = messages.length - 1; i >= 0 && allMentions.length < limit; i--) {
    const text = messages[i].text;
    if (!text) continue;

    const mentions = extractPlantMentions(text);
    for (const mention of mentions) {
      if (!foundNames.has(mention.normalizedName) && allMentions.length < limit) {
        allMentions.push(mention);
        foundNames.add(mention.normalizedName);
      }
    }
  }

  return allMentions;
}

// ============================================================================
// Helper Functions
// ============================================================================

function findRegistryMatches(text: string): PlantMention[] {
  const matches: PlantMention[] = [];
  const normalizedText = text.toLowerCase();

  const registeredPlants = conversationRegistry.getAllPlants();
  for (const plant of registeredPlants) {
    if (plant.commonName && normalizedText.includes(plant.commonName.toLowerCase())) {
      matches.push({
        originalText: plant.commonName,
        normalizedName: plant.commonName.toLowerCase(),
        confidence: "high",
        source: "exact_match",
      });
    }

    if (normalizedText.includes(plant.scientificName.toLowerCase())) {
      matches.push({
        originalText: plant.scientificName,
        normalizedName: plant.scientificName.toLowerCase(),
        confidence: "high",
        source: "exact_match",
      });
    }

    const genus = plant.genus.toLowerCase();
    if (normalizedText.includes(genus) && genus.length > 3) {
      matches.push({
        originalText: plant.genus,
        normalizedName: genus,
        confidence: "medium",
        source: "exact_match",
      });
    }
  }

  return matches;
}

function findExactMatches(text: string): PlantMention[] {
  const matches: PlantMention[] = [];
  const words = text.toLowerCase();

  const sortedNames = [...COMMON_PLANT_NAMES].sort((a, b) => b.length - a.length);

  for (const name of sortedNames) {
    const regex = new RegExp(`\\b${escapeRegex(name)}\\b`, "i");
    const match = words.match(regex);

    if (match) {
      matches.push({
        originalText: match[0],
        normalizedName: name.toLowerCase(),
        confidence: "high",
        source: "common_name",
      });
    }
  }

  return matches;
}

function findPatternMatches(text: string): PlantMention[] {
  const matches: PlantMention[] = [];
  const processedCandidates = new Set<string>();

  for (const pattern of PLANT_PATTERNS) {
    pattern.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const candidate = match[1]?.trim();
      if (!candidate || candidate.length < 3 || candidate.length > 30) continue;

      const normalized = candidate.toLowerCase();
      if (processedCandidates.has(normalized)) continue;
      processedCandidates.add(normalized);

      if (isCommonWord(normalized)) continue;

      const confidence = assessPlantNameConfidence(normalized, text);
      if (confidence !== "low" || COMMON_PLANT_NAMES.has(normalized)) {
        matches.push({
          originalText: candidate,
          normalizedName: normalized,
          confidence,
          source: "pattern",
        });
      }
    }
  }

  return matches;
}

function assessPlantNameConfidence(candidate: string, fullText: string): "high" | "medium" | "low" {
  const normalized = candidate.toLowerCase();

  if (COMMON_PLANT_NAMES.has(normalized)) return "high";
  if (/^[A-Z][a-z]+\s+[a-z]+$/.test(candidate)) return "high";

  const contextPattern = new RegExp(
    `(${PLANT_CONTEXT_WORDS.join("|")})\\s+.{0,30}${escapeRegex(candidate)}|` +
      `${escapeRegex(candidate)}\\s+.{0,30}(${PLANT_CONTEXT_WORDS.join("|")})`,
    "i"
  );

  if (contextPattern.test(fullText)) return "medium";

  return "low";
}

function isCommonWord(word: string): boolean {
  return COMMON_ENGLISH_WORDS.has(word.toLowerCase());
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizePlantName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ").replace(/['']/g, "'");
}

export function isPlantRelatedQuery(text: string): boolean {
  const normalizedText = text.toLowerCase();

  const plantKeywords = [
    "plant", "grow", "garden", "water", "prune", "fertilize", "harvest",
    "seed", "cutting", "propagate", "repot", "transplant", "leaf", "leaves",
    "flower", "bloom", "fruit", "vegetable", "herb", "tree", "shrub",
    "houseplant", "indoor plant", "outdoor", "pot", "soil", "sunlight",
    "shade", "care", "dying", "yellow", "brown", "drooping", "wilting",
  ];

  for (const keyword of plantKeywords) {
    if (normalizedText.includes(keyword)) return true;
  }

  for (const plantName of COMMON_PLANT_NAMES) {
    if (normalizedText.includes(plantName)) return true;
  }

  return false;
}
