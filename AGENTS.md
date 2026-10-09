# Rules for Working with This Repo

The following rules are intended to maintain transparency of the current state of implementation of the functionality envisioned and promote effective evolution of this project, so as to optimize reliability of the information and optimize the incremental value of reflection on any given topic.

- Each feature request should be documented as a user story in a single place - e.g. product subfolder of the main repo or a stand-alone sub-project
- Each functionality implemented need to be documented as a specification, at least on a high level, typically in the specifications/ subfolder of the project, or a similar subfolder of the specific capability
- the testing state for each specified functionality should be described in the same document
    - list all the tests applied to verify the behavior of a feature, ideally adding a working link to the test files and referencing the corresponding functions, if relevant
    - include a narrative reasoning whether and why the tests included or planned are sufficient to ensure alignment with the the behavior spec, and the ultimatel goal of the feature development is also satisfied.
    - if some gaps emerge, propose additional tests along with succinct reasoning on why these are necessary / sufficient
    - if these are not clearly sufficient, leave a todo item asking to think further
- each specification should have a purpose (could link to a request file in the product folder), perhaps an ID
- Whenever referencing a file in this project, include a clickable link like [this](relative/path/to/file.ext)

## How to minimize maintenance

To keep the information included in this evolving repository reliable without additional burden of constant updates, we should aim to minimize the necessity to update information when adding features, updating structure or fixing bugs.

To that extent, written information should never be duplicated across multiple places:

- README should explain the setup and include working links to other materials (e.g. documentation within subfolders, individual scripts if relevant), and how to find relevant functions in each file, not extracts from these files.
- Other markdown documents should prefer linking specific functional files (with clickable links) instead of restating what they do (which can get out of sync if these files change)
- No need to report test status or number of tests overall (it would be reported when running the tests)
- Documents in a given parent folder should never discuss details of multiple similar files in a deeper subfolder (at least when it can be reasonably envisioned that the number of such similar files can change over time)

