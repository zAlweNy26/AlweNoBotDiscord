import { describe, expect, it } from "vitest"
import { rankActivity } from "../../src/lib/activity"

function message(authorId: string, content = "ciao") {
  return { authorId, content }
}

describe("rankActivity", () => {
  it("ranks authors by message count", () => {
    const report = rankActivity(
      [message("a"), message("b"), message("b"), message("c"), message("b"), message("a")],
      10,
    )
    expect(report.top.map((entry) => entry.authorId)).toEqual(["b", "a", "c"])
    expect(report.top.map((entry) => entry.messages)).toEqual([3, 2, 1])
  })

  it("counts totals and participants", () => {
    const report = rankActivity([message("a"), message("a"), message("b")], 10)
    expect(report.total).toBe(3)
    expect(report.participants).toBe(2)
  })

  it("computes the share of each author", () => {
    const report = rankActivity([message("a"), message("a"), message("b"), message("c")], 10)
    expect(report.top.map((entry) => entry.share)).toEqual([50, 25, 25])
  })

  it("sums trimmed content length per author", () => {
    const report = rankActivity([message("a", "  1234  "), message("a", "56")], 10)
    expect(report.top[0]?.characters).toBe(6)
  })

  it("breaks ties on characters written, then on author id", () => {
    const report = rankActivity([message("b", "lungo"), message("a", "x"), message("c", "x")], 10)
    expect(report.top.map((entry) => entry.authorId)).toEqual(["b", "a", "c"])
  })

  it("keeps only the requested number of authors", () => {
    const report = rankActivity([message("a"), message("b"), message("c")], 2)
    expect(report.top).toHaveLength(2)
    expect(report.participants).toBe(3)
  })

  it("handles an empty channel", () => {
    expect(rankActivity([], 10)).toEqual({ total: 0, participants: 0, top: [] })
  })
})
