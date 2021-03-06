import * as core from '@actions/core'
import * as github from '@actions/github'

import { formatNameWithOwner } from './utils'

interface IssueNumber {
  number: number
}

export type GraphQlQueryResponseData = { [key: string]: any } | null

const query = `
query($searchQuery: String!) {
  search(first: 100, query: $searchQuery, type: ISSUE) {
    nodes {
      ... on Issue {
        number
      }
    }
  }
}
`

async function closeIssues(octokit: github.GitHub, numbers: Array<number>) {
  const context = github.context

  return numbers.map(async (number) => {
    core.info(`Close https://github.com/${formatNameWithOwner(context.repo)}/issues/${number}`)

    return octokit.issues.update({ ...context.repo, issue_number: number, state: 'closed' })
  })
}

export async function getIssueNumbers(
  octokit: github.GitHub,
  searchQuery: string
): Promise<Array<number>> {
  const context = github.context
  const queryText = `repo:${formatNameWithOwner(context.repo)} ${searchQuery}`

  core.info(`Query: ${queryText}`)

  const results: GraphQlQueryResponseData = await octokit.graphql(query, { searchQuery: queryText })

  core.info(`Results: ${JSON.stringify(results)}`)

  if (results) {
    return results.search.nodes.map((issue: IssueNumber) => issue.number)
  } else {
    return []
  }
}

async function run() {
  try {
    const token = core.getInput('token')

    if (!token) {
      throw new Error('`token` is a required input parameter')
    }

    const searchQuery = core.getInput('query')

    if (!searchQuery) {
      throw new Error('`query` is a required input parameter')
    }

    const octokit = new github.GitHub(token)

    const issueNumbers = await getIssueNumbers(octokit, searchQuery)

    await closeIssues(octokit, issueNumbers)

    core.setOutput('num', `${issueNumbers.length}`);
    core.info(`issues: ${issueNumbers}`);
  } catch (error) {
    core.setOutput('num', '0');
    core.setFailed(error.message)
  }
}

run()
