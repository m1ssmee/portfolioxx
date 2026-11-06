import { Component, type ReactNode } from 'react'

type Props = { onError: (error: unknown) => void; children: ReactNode }

/** If anything in the 3D view throws, report it and render nothing, so the page can fall back to the plain view. */
export class SceneBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error('The 3D view failed, switching to the plain view.', error)
    this.props.onError(error)
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}
