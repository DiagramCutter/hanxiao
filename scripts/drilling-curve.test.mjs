// Run with Node 22.17+: node --experimental-strip-types --test scripts/drilling-curve.test.mjs
import assert from 'node:assert/strict'
import test from 'node:test'
import { parseDrillingCurve, curveSegments } from '../src/views/SceneForklift/drillingCurve.ts'

function response(totalPoints = '3') {
  return {
    code: 0,
    msg: 'success',
    data: {
      pileName: 'S2-1',
      depthUnit: 'm',
      offsetUnit: 'mm',
      totalPoints,
      sampled: false,
      points: [
        { depthM: 0, dipXMm: 0, dipYMm: 0, updatedAt: '2026-10-07T08:00:00+08:00' },
        { depthM: 1, dipXMm: null, dipYMm: -0.3, updatedAt: '2026-10-07T08:01:00+08:00' },
        { depthM: 2, dipXMm: 1.07, dipYMm: 0.6, updatedAt: '2026-10-07T08:02:00+08:00' },
      ],
    },
  }
}

test('accepts Java Long string counts and numeric counts without changing observations', () => {
  for (const count of ['3', 3]) {
    const result = parseDrillingCurve(response(count), 'S2-1')
    assert.equal(result.totalPoints, 3)
    assert.deepEqual(result.points, response().data.points)
    assert.deepEqual(curveSegments(result.points, 'dipXMm'), [
      [{ offset: 0, depth: 0 }],
      [{ offset: 1.07, depth: 2 }],
    ])
  }
})

test('supports string counts for empty and sampled responses', () => {
  const empty = response('0')
  empty.data.points = []
  assert.equal(parseDrillingCurve(empty, 'S2-1').totalPoints, 0)
  const sampled = response('201')
  sampled.data.sampled = true
  sampled.data.points = [sampled.data.points[0], sampled.data.points[2]]
  const result = parseDrillingCurve(sampled, 'S2-1')
  assert.equal(result.totalPoints, 201)
  assert.equal(result.points.length, 2)
  assert.equal(result.sampled, true)
})

test('does not coerce invalid counts or accept inconsistent metadata', () => {
  for (const count of [
    null,
    false,
    '',
    ' ',
    '3.0',
    '3e0',
    '-3',
    'NaN',
    'Infinity',
    '9007199254740993',
    Number.MAX_SAFE_INTEGER + 1,
    '2',
    '4',
  ]) {
    assert.throws(() => parseDrillingCurve(response(count), 'S2-1'))
  }
  const invalidSample = response('3')
  invalidSample.data.sampled = true
  assert.throws(() => parseDrillingCurve(invalidSample, 'S2-1'))
})

test('retains pile, unit and point validation', () => {
  assert.throws(() => parseDrillingCurve(response(), 'S1-1'))
  const invalidUnit = response()
  invalidUnit.data.offsetUnit = 'm'
  assert.throws(() => parseDrillingCurve(invalidUnit, 'S2-1'))
  const invalidPoint = response()
  invalidPoint.data.points[1].dipXMm = 'not a number'
  assert.throws(() => parseDrillingCurve(invalidPoint, 'S2-1'))
})
