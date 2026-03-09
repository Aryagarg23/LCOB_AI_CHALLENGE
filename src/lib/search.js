import { search } from 'duck-duck-scrape';

/**
 * Perform a real-time web search using DuckDuckGo to provide
 * up-to-date context for our LLM Sub-Agents.
 * 
 * @param {string} query - The search string
 * @param {number} limit - Maximum number of results to fetch
 * @returns {Promise<string>} - A compressed text summary of the search results
 */
export async function performWebSearch(query, limit = 3) {
  try {
    console.log(`[Web Search] Querying: "${query}"`);
    const results = await search(query, { safeSearch: search.SafeSearchType.STRICT });
    
    if (!results || !results.results || results.results.length === 0) {
      return "No recent data found.";
    }

    // Map the top results into a clean, text-based format for the LLM to read
    const topResults = results.results.slice(0, limit);
    const contextString = topResults.map((res, index) => {
        return `Result ${index + 1}:\nTitle: ${res.title}\nURL: ${res.url}\nSnippet: ${res.description}`;
    }).join('\n\n');

    return contextString;
  } catch (err) {
    console.error(`[Web Search Error] for query "${query}":`, err.message);
    return "Error performing live search. Rely on internal knowledge heuristics.";
  }
}
